---
title: "letting an llm touch your filesystem"
description: "What happens when you give a language model the ability to run shell commands, and how containers make it less terrifying."
date: 2026-02-16
---

Imagine you give an LLM the ability to run shell commands on your machine. Not hypothetically — you literally wire up a function that takes a string from the model and passes it to `bash -c`. The model decides what to run. Your code executes it.

This is terrifying for obvious reasons. LLMs hallucinate. They confidently generate plausible-looking commands that do the wrong thing. `rm -rf /` is one bad inference away. And unlike a regular bug where you can read the code and trace the logic, the "logic" here is a neural network that decided `mv` wasn't quite right and maybe `rm` followed by a fresh start would be cleaner.

I ran into this problem while building [mildred](https://github.com/sammcclenaghan/mildred), a CLI tool where you describe file organization rules in English and an LLM figures out the shell commands. The interesting part wasn't the file organization — it was figuring out how to let an LLM touch the filesystem without losing sleep over it.

## tool calling as the interface

Modern LLMs don't just generate text — they can request actions through "tool calling." You define tools (functions the model can invoke), and the model decides when to call them and with what arguments. The model never executes anything directly. It says "I'd like to run this command," and your code decides whether to actually do it.

In my case, I'm using ruby_llm, which gives you a clean interface for this:

```ruby
chat = RubyLLM.chat(model: "llama3.1:8b")
chat.with_tool(Mildred::Tools::RunCommand)
response = chat.say("Organize the files in #{directory}")
```

The `RunCommand` tool is the scary part. It's a class that takes whatever command the LLM wants to run and passes it straight to bash:

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

This is the entire trust boundary. The LLM generates a command string, and this method runs it. Everything after this is about making that `execute` method less dangerous.

## the first line of defense: noop mode

The simplest thing you can do is let people see what would happen before it happens. A dry run. The LLM still generates commands, but instead of executing them, you just print them out.

I needed a way to track whether we're in noop mode across the whole application without threading a flag through every method signature. In Rails, I'd use `CurrentAttributes` for this. Turns out you can use ActiveSupport outside of Rails — you just require the specific module:

```ruby
require "active_support"
require "active_support/current_attributes"

module Mildred
  class Current < ActiveSupport::CurrentAttributes
    attribute :container_id, :noop, :job_name
  end
end
```

Now anywhere in the code, I can check `Mildred::Current.noop` to decide whether to actually run a command or just log it. It's thread-safe and resets between test runs. Honestly, it's probably overkill for a CLI tool, but I like that it keeps method signatures clean — no passing `noop:` through five layers of calls.

But noop mode only helps when someone remembers to use it. And it doesn't protect you from the case where you *do* want the LLM to execute commands, just not destructive ones outside your target directories. For that, you need actual isolation.

## the real solution: containers

The answer I landed on was running every LLM-generated command inside a container. Not Docker — Apple containers, which are lightweight Linux VMs available on macOS. The key insight is mount-based isolation: you explicitly specify which directories the container can see, and everything else simply doesn't exist from its perspective.

```ruby
def run_container
  name = "mildred-#{Process.pid}-#{SecureRandom.hex(4)}"
  args = ["container", "run", "-d", "--name", name]
  args.concat(mount_args)  # Only these directories are visible
  args.concat([IMAGE, "sleep", "infinity"])
  # ...
end
```

If the LLM generates `rm -rf /`, the container's root filesystem is a disposable Alpine Linux image. Your actual files are only accessible through the mounts you explicitly set up. The LLM can see your `~/Downloads` folder if you mount it, but it cannot see `~/.ssh` or `/etc` or anything else. It's not that the commands are filtered or validated — it's that the filesystem the LLM operates on is fundamentally limited.

This feels like the right level of abstraction. Instead of trying to parse and validate every command the LLM generates (which is basically impossible — there are too many ways to be destructive), you change the environment so that destructive commands can't reach anything important.

## why containers feel obvious in retrospect

Once I had the container setup working, I realized it solved more than just safety. The environment is identical every run. Alpine Linux with bash, coreutils, and findutils. No "works on my machine" problems, because it's not running on my machine — it's running in a controlled environment where I know exactly what's installed.

This also makes the LLM's job easier. When the model generates commands, it doesn't have to guess whether the system has `find` with GNU extensions or BSD `find`. It's always Alpine. The prompts can be more specific, and the commands are more predictable.

The overhead is minimal. Alpine images are tiny. Container startup takes less than a second. For a tool that's about to spend several seconds waiting for an LLM to generate a response anyway, the container setup time is noise.

I'm honestly surprised more developer tools don't do this. Any tool that generates and executes code — formatters, linters, build systems, AI coding assistants — could benefit from running in a container. The safety guarantee is almost free.

## trust boundaries in AI-powered tools

Working on this changed how I think about LLM integration. The temptation is to treat the LLM like a function: input goes in, output comes out, trust the output. But LLMs aren't functions. They're probabilistic systems that sometimes generate confident, plausible, wrong answers.

The useful mental model is defense in depth. Noop mode catches mistakes during development. Containers prevent damage in production. Neither is perfect on its own — noop mode doesn't help when you actually want to run commands, and containers don't prevent the LLM from making a mess of the directories it *can* see. But layered together, they make the tool usable without constant anxiety.

The broader lesson is about where you draw the trust boundary. With a traditional program, you trust your own code. With an LLM-powered tool, you're trusting a model that might do something unexpected on any given run. The answer isn't to not use LLMs — it's to design your system so that "unexpected" can't mean "catastrophic." Containers give you that. The LLM can be creative, can hallucinate, can try weird things — and the blast radius is limited to a disposable environment with only the files you chose to expose.

That feels like the right trade-off. Not perfect safety, but bounded risk. And honestly, building the sandboxing was more interesting than the file organization itself.
