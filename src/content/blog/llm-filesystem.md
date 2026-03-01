---
title: "Letting an LLM Touch Your Filesystem"
description: "What happens when you give a language model the ability to run shell commands, and how containers make it less terrifying."
date: 2026-02-16
---

Imagine giving an LLM the ability to run shell commands on your actual machine.

Not hypothetically. I mean literally wiring up a function that takes a string from the model and passes it directly to `bash -c`.

The model decides what to run. Your code executes it.

This is terrifying.

LLMs hallucinate. They confidently generate plausible-looking commands that do the exact wrong thing. `rm -rf /` is literally one bad inference away. And unlike a regular bug where you can read the code and trace the logic, the "logic" here is a neural network that decided `mv` wasn't quite right and maybe deleting your root directory was a cleaner start.

I ran into this exact problem while building [mildred](https://github.com/sammcclenaghan/mildred). It's a CLI tool where you describe file organization rules in English, and an LLM figures out the shell commands to make it happen. 

The interesting part wasn't the file organization. It was figuring out how to let an LLM touch my filesystem without losing sleep over it.

## Tool Calling is the Interface

Modern LLMs don't just generate text anymore. They request actions through "tool calling."

You define tools (functions), and the model decides when to call them and what arguments to pass. The model *never* executes anything directly. It says, "I'd like to run this command," and your code decides whether to actually do it.

I'm using `ruby_llm`, which gives you a brilliantly clean interface for this:

```ruby
chat = RubyLLM.chat(model: "llama3.1:8b")
chat.with_tool(Mildred::Tools::RunCommand)
response = chat.say("Organize the files in #{directory}")
```

That `RunCommand` tool is the scary part. It's just a class that takes whatever command the LLM hallucinated and passes it straight to bash:

```ruby
class RunCommand < RubyLLM::Tool
  description "Executes a shell command and returns its output"
  param :command, desc: "The shell command to execute"

  def execute(command:)
    stdout, stderr, status = Open3.capture3("bash", "-c", command)
    { stdout: stdout, stderr: stderr, exit_code: status.exitstatus }
  end
end
```

This is the entire trust boundary. Everything after this is about making that `execute` method less dangerous.

## The First Line of Defense: Noop Mode

The absolute simplest thing you can do is let people see what would happen before it happens. A dry run. 

Instead of executing the command, you just print it out.

I needed a way to track whether we're in noop mode across the whole application, without threading a massive flag through every single method signature. In Rails, I'd use `CurrentAttributes` for this. 

Turns out you can just use ActiveSupport outside of Rails:

```ruby
require "active_support"
require "active_support/current_attributes"

module Mildred
  class Current < ActiveSupport::CurrentAttributes
    attribute :container_id, :noop, :job_name
  end
end
```

Now anywhere in the code, I check `Mildred::Current.noop`. It's thread-safe and resets between test runs. It keeps method signatures incredibly clean.

But noop mode only helps when someone remembers to use it. And it doesn't protect you when you *do* want the LLM to execute commands, just not destructive ones.

For that, you need actual isolation.

## The Real Solution: Containers

The answer I landed on was running every LLM-generated command inside a container.

Not Docker. Apple containers. These are lightweight Linux VMs natively available on macOS. The key insight is mount-based isolation. You explicitly specify which directories the container can see. Everything else simply doesn't exist.

```ruby
def run_container
  name = "mildred-#{Process.pid}-#{SecureRandom.hex(4)}"
  args = ["container", "run", "-d", "--name", name]
  args.concat(mount_args)  # Only these directories are visible
  args.concat([IMAGE, "sleep", "infinity"])
  # ...
end
```

If the LLM generates `rm -rf /`, who cares? The root filesystem is a disposable Alpine Linux image.

Your actual files are only accessible through the mounts you explicitly set up. The LLM can see your `~/Downloads` folder if you mount it, but it physically cannot see `~/.ssh` or `/etc`.

I don't have to parse or validate every command the LLM generates (which is basically impossible anyway). I just change the environment so that destructive commands can't reach anything important.

## Why Containers Feel Obvious Now

Once I had this working, I realized it solved more than just safety.

The environment is identical every single run. Alpine Linux with bash, coreutils, and findutils. There are no "works on my machine" problems because it's not running on my machine.

This also makes the LLM's job significantly easier.

The model doesn't have to guess whether the system has `find` with GNU extensions or BSD `find`. It's always Alpine. The prompts can be more specific, and the commands are infinitely more predictable.

The overhead is basically zero. Alpine images are tiny, and container startup takes less than a second. If I'm already waiting several seconds for an LLM to generate a response, the container setup time is literally noise.

I'm honestly surprised more developer tools don't do this. The safety guarantee is almost free.

## Trust Boundaries in AI

Working on this fundamentally changed how I think about LLM integration.

The temptation is to treat an LLM like a function. Input goes in, output comes out, trust the output. 

**LLMs aren't functions.** They are probabilistic systems that sometimes generate confident, plausible, completely wrong answers.

The useful mental model is defense in depth. Noop mode catches mistakes during development. Containers prevent damage in production. Neither is perfect on its own, but layered together, they make the tool genuinely usable without constant anxiety.

The broader lesson is about where you draw the trust boundary. With traditional code, you trust yourself. With an LLM, you're trusting a model that might do something completely unhinged on any given run.

The answer isn't to stop using LLMs. It's to design your system so that "unexpected" can't mean "catastrophic." 

The LLM can be creative, hallucinate, and try weird things—and the blast radius is strictly limited to a disposable environment. That feels like the right trade-off.

And honestly, building the sandbox was way more interesting than the file organization itself.