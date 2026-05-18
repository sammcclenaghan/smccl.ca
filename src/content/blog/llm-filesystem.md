---
title: "Learning Why AI Agents Need Sandboxes"
description: "A small experiment with LLM-generated shell commands, inspired by Nanoclaw and the old maid gem."
date: 2026-02-16
---

I started thinking about this after reading [Nanoclaw](https://github.com/nanocoai/nanoclaw).

The idea that stuck with me was simple: if an agent can run shell commands, it should run them inside a container.

Nanoclaw uses that pattern to give agents real tools without giving them the whole host machine.

I wanted to understand that pattern better, so I built a much smaller experiment.

The old Ruby gem `maid` let you write rules for cleaning up files. I wanted to make a tiny LLM version of that.

So I built [mildred](https://github.com/sammcclenaghan/mildred), a command-line maid for your filesystem.

You describe file organization rules in English, and an LLM figures out the shell commands to make them happen.

That immediately creates a safety problem.

Imagine giving an LLM the ability to run shell commands on your actual machine.

The model decides what to run. Your code executes it.

That is a pretty strange thing to trust.

## The Boundary

Modern LLMs can use tools. You define a function, and the model decides when to call it and what arguments to pass.

In Mildred, the important tool is `RunCommand`:

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

That `execute` method is the trust boundary. The model asks for a command. My code decides whether and where to run it.

At first, I added a noop mode. Instead of executing the command, Mildred can print what it would run.

That is useful, but it is not real isolation.

If I actually want the LLM to move files, I need a safer place for those commands to run.

## The Sandbox

This is where the Nanoclaw idea clicked for me.

Run the command in a container, and only mount the directories the tool should touch.

```ruby
def run_container
  name = "mildred-#{Process.pid}-#{SecureRandom.hex(4)}"
  args = ["container", "run", "-d", "--name", name]
  args.concat(mount_args)  # Only these directories are visible
  args.concat([IMAGE, "sleep", "infinity"])
  # ...
end
```

If the LLM generates a bad command, the damage is limited to the mounted workspace.

It cannot see my whole home directory. It cannot reach `~/.ssh`. It cannot accidentally delete files I never mounted.

I also get a predictable environment. The model is always writing commands for the same small Linux image.

That was the main thing I learned.

The hard part was not asking an LLM to generate shell commands. That part is easy.

The hard part was deciding where trust ends.

For a small student project, this was a useful lesson: when software starts acting on the real world, even in tiny ways, the boundary matters more than the clever part.
