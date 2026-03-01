---
title: "Testing Non-Deterministic Code With VCR"
description: "How to use VCR to record and replay HTTP interactions for testing code that talks to non-deterministic APIs like LLMs."
date: 2026-02-16
---

If you've ever written tests for code that hits an external API, you know the pain.

The response changes between runs. The API is agonizingly slow. You're burning rate limits or literal money just to run your CI suite. And if the service goes down, your builds fail for reasons entirely out of your control.

This gets so much worse with LLM APIs.

I ran into this while building a CLI tool that uses an LLM to generate shell commands. I needed to test the full flow: send a prompt, get a response, execute the tool calls. But doing that meant hitting an API every single time.

I reached for VCR. I'd used it before for regular REST APIs, but I wasn't sure if it could handle something as fundamentally unpredictable as an LLM.

Turns out, it works perfectly.

## What is VCR?

VCR is a Ruby library that records HTTP interactions and replays them in future test runs.

The name comes from VHS tapes. You "record" a cassette the first time the test runs, and then you "play it back" every time after.

The idea is incredibly simple. The first time your test makes a real HTTP request, VCR intercepts it, lets it go through, and saves the exact request and response to a YAML file (the "cassette"). On subsequent runs, VCR intercepts that same request and instantly returns the saved response instead of hitting the network.

You get four massive benefits for free:
1. **Absolute Determinism:** The response never changes.
2. **Speed:** Zero network round-trips. Tests are instant.
3. **Offline Testing:** CI doesn't even need internet access.
4. **No API Costs:** You record once, and replay forever.

## Why LLM APIs Are A Nightmare

Most APIs are somewhat deterministic. If you `GET /users/123`, you expect the same user data back.

LLM APIs are different.

First, they are non-deterministic by design. The exact same prompt can produce wildly different responses. Even with `temperature: 0`, there is no hard guarantee of identical output.

Second, they are incredibly slow. An LLM call takes seconds, not milliseconds. Run a test suite with 20 of those, and you're waiting a full minute just for network overhead.

Third, they cost money. Every test run burns tokens. Iterate on a test 50 times? You just bought OpenAI a coffee.

Fourth—and this surprised me the most—tool-calling adds insane complexity. When an LLM calls a tool, it's not a single request. It's a multi-turn conversation. You send a prompt, it replies with a tool request, you execute the tool and send back the result, and it responds again.

VCR needs to capture that entire sequence.

## Setting Up VCR

The configuration is almost non-existent. You tell VCR where to save the YAML files, what HTTP library to hook into, and how to handle recording:

```ruby
VCR.configure do |config|
  config.cassette_library_dir = "test/fixtures/vcr_cassettes"
  config.hook_into :webmock
  config.default_cassette_options = { 
    record: ENV["CI"] ? :none : :once 
  }
end
```

That `record` option is the magic part.

`:once` means VCR records the very first time it sees a new request, and then replays it forever. In CI, we set it to `:none`. If a cassette is missing, the test explicitly fails instead of making a real API call. It's the ultimate safety net: nobody can push a test without recording the cassette locally first.

You wrap your test in a `VCR.use_cassette` block and give it a name:

```ruby
def test_organizes_files
  VCR.use_cassette("runner_move_files") do
    # set up test files
    # run the agent
    # assert the files were moved
  end
end
```

That's literally it.

## What A Cassette Looks Like

The cassette is just a standard YAML file. Here's a simplified version from my project:

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

You can read exactly what the LLM decided to do. The cassette captures the full HTTP exchange—headers, body, status code—so VCR can replay it pixel-perfectly.

Because they're human-readable, cassettes basically double as documentation. If a test fails after re-recording, you just diff the old and new YAML files to see exactly how the LLM changed its mind.

## Testing The Full Flow

With VCR handling the HTTP layer, your test can actually focus on what matters: did the agent do its job?

A typical test looks like this:

```ruby
def test_moves_text_files_to_documents
  VCR.use_cassette("runner_move_files") do
    # Create some test files
    FileUtils.touch("test_workspace/notes.txt")
    FileUtils.touch("test_workspace/readme.txt")

    # Run the agent
    runner.execute("Move all .txt files to the documents folder")

    # Assert the outcome
    assert File.exist?("test_workspace/documents/notes.txt")
    assert File.exist?("test_workspace/documents/readme.txt")
  end
end
```

The test reads like plain English. Set up files. Tell the agent what to do. Check that it worked.

VCR is entirely invisible here. It just guarantees the LLM call returns the recorded response every single time.

I genuinely expected testing LLM agents to require complex mocking or custom infrastructure. Instead, VCR lets you write entirely normal integration tests. The LLM interaction is just another dumb HTTP call.

## When To Re-Record

The `record: :once` strategy means cassettes can go stale. If you change a prompt, the LLM might respond differently in real life, but VCR will keep aggressively replaying the old response.

Your tests will pass, but they're testing outdated reality.

Here is how you handle it:

**Delete and Re-run:** The easiest approach. Nuke the YAML file and run the test. VCR records a fresh interaction. I do this every time I tweak a prompt.

**New Episodes:** Use `record: :new_episodes`. It records new requests but replays existing ones. Great when you're adding new test cases to an existing block.

Cassettes are strictly disposable. They are fixtures, not your source of truth. If something feels off, delete them and re-record.

## What I Learned

VCR solved my exact problem—testing an LLM without hitting the API constantly—but the pattern is universal.

Any code that talks to an external HTTP service should probably use this. Payment APIs, weather services, auth providers. If you don't control the response, mock it at the network boundary.

Testing non-deterministic code doesn't require insane frameworks. You just need to force the non-deterministic part to be deterministic.

VCR does this beautifully at the HTTP layer. It doesn't care if it's talking to an LLM, a REST API, or a GraphQL endpoint. You record reality once, and you replay it forever.

Is it perfect? No. Your tests can drift if you don't re-record periodically. But for the tradeoff of having an instantly fast, perfectly deterministic, completely offline test suite?

I'll take it every time.