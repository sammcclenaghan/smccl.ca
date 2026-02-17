---
title: "Testing LLM Agents with VCR (and Other Things I Learned Building a CLI Tool)"
description: "I built a file organization tool to explore how to test LLM-powered agents, make CLIs feel nice, and sandbox potentially destructive operations."
date: 2026-02-16
---

I wanted to build something with LLMs that actually touched the filesystem. Not a chatbot—something that made decisions and took actions. A file organizer seemed simple enough: describe what you want in English, let an LLM figure out the shell commands, execute them.

The tricky part was making it testable. And safe. And not terrible to use.

## Recording LLM interactions with VCR

Testing code that calls LLMs is annoying. The responses are non-deterministic, API calls are slow, and you don't want to burn through tokens in CI. I reached for VCR, which I usually use for HTTP API testing, but wasn't sure if it would work for LLM agent testing.

It turns out VCR is perfect for this. You record the LLM interaction once, then replay it in tests:

```ruby
VCR.configure do |config|
  config.cassette_library_dir = "test/fixtures/vcr_cassettes"
  config.hook_into :webmock
  config.default_cassette_options = { 
    record: ENV["CI"] ? :none : :once 
  }
end
```

The cassette captures the raw HTTP request/response to the LLM API. In my case, that's the OpenAI-compatible endpoint from Ollama running locally. The recorded response includes the LLM's decision to call a tool—in my case, a `run_command` tool that executes shell operations.

```yaml
# test/fixtures/vcr_cassettes/runner_move_files.yml
http_interactions:
- request:
    method: post
    uri: http://localhost:11434/v1/chat/completions
  response:
    body:
      string: '{"choices":[{"message":{"tool_calls":[
        {"function":{"name":"run_command","arguments":"{\"command\":\"mv *.txt ...\"}"}}
      ]}}]}'
```

This lets me test the entire flow: parsing a job description, sending it to the LLM, receiving tool calls, and executing them. Without VCR, I'd be mocking HTTP responses manually or hitting real APIs in tests.

The `record: :once` option means it records on the first run, then replays forever. In CI, `record: :none` ensures we never make real API calls.

## Making CLIs feel nice with Gum

I've always admired CLI tools that feel polished—proper spinners, colored output, clear progress indicators. I discovered Marco Roth's Gum library and wanted to try it.

Gum wraps common CLI patterns in simple Ruby methods. Instead of printing "Loading..." and hoping the user waits, you get a proper spinner:

```ruby
Gum.spin("Cleaning up stale containers...", spinner: :dot) do
  Container.cleanup_stale
end
```

Styled output is similarly straightforward:

```ruby
puts Gum.style("▸ #{job.name}", foreground: "212", bold: true)
puts Gum.style("  ✓ Done", foreground: "46")
```

The result feels intentional. Not just a script, but a tool.

## Abstracting LLMs with ruby_llm

I started with raw HTTP calls to the Ollama API, but switching between local models and OpenAI meant maintaining two code paths. Wilson Silva's ruby_llm gem abstracts this nicely:

```ruby
chat = RubyLLM.chat(model: "llama3.1:8b")
chat.with_tool(Mildred::Tools::RunCommand)
response = chat.say("Organize the files in #{directory}")
```

The gem handles different providers (Ollama, OpenAI, OpenRouter) with the same interface. More importantly, it has first-class support for tool calling—the mechanism LLMs use to request actions from your code.

My `RunCommand` tool is a simple class that inherits from `RubyLLM::Tool`:

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

The LLM decides when to call it and what commands to run. My job is validating those commands and executing them safely.

## Using ActiveSupport outside Rails

I wanted a way to track context throughout a job execution—whether we're in noop mode, which container we're using, what the current job name is. In Rails, I'd use `CurrentAttributes`. I wondered if it would work in a standalone CLI tool.

It does:

```ruby
require "active_support"
require "active_support/current_attributes"

module Mildred
  class Current < ActiveSupport::CurrentAttributes
    attribute :container_id, :noop, :job_name
  end
end
```

Now anywhere in the code, I can check `Mildred::Current.noop` or set `Mildred::Current.job_name = "Clean Downloads"`. It's thread-safe and resets automatically between tests.

This is probably overkill for a small CLI, but I like the pattern. It keeps method signatures clean—no need to pass `noop` and `job_name` through every helper function.

## Sandboxing with Apple containers

The biggest challenge was safety. I'm letting an LLM generate shell commands that will run on my machine. Even with good prompts, hallucinations happen.

My solution: Apple containers. Every file operation runs inside a container with only the specified directories mounted. The LLM literally cannot see or touch anything outside those mounts.

```ruby
def run_container
  name = "mildred-#{Process.pid}-#{SecureRandom.hex(4)}"
  args = ["container", "run", "-d", "--name", name]
  args.concat(mount_args)  # Only these directories are visible
  args.concat([IMAGE, "sleep", "infinity"])
  # ...
end
```

This means even if the LLM generates `rm -rf /`, the container only sees the mounted directories. It's not perfect security—there are always escape vectors—but it's a meaningful layer of defense.

The container also provides reproducibility. The environment is identical every run: Alpine Linux with bash, coreutils, and findutils. No "works on my machine" because it's not running on my machine—it's running in the container.

## What I learned

Building this taught me a few things:

**VCR works for LLM testing.** I was skeptical, but recording and replaying LLM interactions makes testing agent-like behavior feasible. The cassettes are human-readable YAML, so you can inspect what the LLM decided and verify your code responded correctly.

**CLI UX matters more than I thought.** Adding Gum spinners and styled output took minutes but made the tool feel finished. It's worth the dependency.

**Tool-calling is the right abstraction.** Rather than parsing LLM responses myself, letting ruby_llm handle the tool-calling protocol means I write less code and support more providers.

**Containers for sandboxing CLI tools feels obvious in retrospect.** I'm surprised more developer tools don't do this. The overhead is minimal (Alpine images are tiny) and the safety guarantee is worth it.

I'm still not sure if LLM-powered file organization is a good idea. But the exploration was worth it.
