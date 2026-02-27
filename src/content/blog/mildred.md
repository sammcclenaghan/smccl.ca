---
title: "testing non-deterministic code with vcr"
description: "How to use VCR to record and replay HTTP interactions for testing code that talks to non-deterministic APIs like LLMs."
date: 2026-02-16
---

If you've ever written tests for code that calls an external API, you know the pain. The response changes between runs. The API is slow. You're burning rate limits or tokens just to run your test suite. And if the service is down, your CI fails for reasons that have nothing to do with your code.

This gets worse with LLM APIs specifically, but the core problem isn't unique to them. Any external service where you don't control the response is a headache to test deterministically.

I ran into this while building a CLI tool that uses an LLM to generate shell commands. I needed to test the full flow—send a prompt, get a response, execute the tool calls—without actually hitting an API every time. I reached for VCR, which I'd used before for regular API testing, but I wasn't sure if it would work for something as unpredictable as LLM responses.

Turns out it works great.

## what is vcr?

VCR is a Ruby library (with ports in other languages) that records HTTP interactions and replays them in future test runs. The name comes from VHS tapes—you "record" a cassette the first time, then "play it back" every time after.

The idea is simple: the first time your test makes a real HTTP request, VCR intercepts it, lets it go through, and saves both the request and response to a YAML file (the "cassette"). On subsequent runs, VCR intercepts the same request and returns the saved response instead of hitting the network.

This gives you a few things for free:
- **Determinism.** The response is always the same.
- **Speed.** No network round-trip.
- **Offline testing.** CI doesn't need API access.
- **No token costs.** You record once and replay forever.

## why llm apis are especially tricky

Most APIs are at least somewhat deterministic. If you `GET /users/123`, you get back the same user (assuming the data hasn't changed). LLM APIs are different in a few ways.

First, they're non-deterministic by design. The same prompt can produce completely different responses. Even with `temperature: 0`, there's no hard guarantee of identical output across runs.

Second, they're slow. A typical LLM API call takes seconds, not milliseconds. Run a test suite with 20 of those and you're waiting a minute just for the network calls.

Third, they're expensive. Every test run burns tokens. This adds up fast, especially if you're iterating on tests frequently.

Fourth—and this is the one I didn't expect—tool-calling adds complexity. When an LLM decides to call a tool, the interaction isn't a single request/response. It's a multi-turn conversation: you send a prompt, the LLM responds with a tool call request, you execute the tool and send back the result, and the LLM responds again. VCR needs to capture the entire sequence.

## setting up vcr

The configuration is minimal. You tell VCR where to store cassettes, what HTTP library to hook into, and how to handle recording:

```ruby
VCR.configure do |config|
  config.cassette_library_dir = "test/fixtures/vcr_cassettes"
  config.hook_into :webmock
  config.default_cassette_options = { 
    record: ENV["CI"] ? :none : :once 
  }
end
```

The interesting bit is the `record` option. `:once` means VCR will record the first time it encounters a new request, then replay it forever after. In CI, we set it to `:none`—if a cassette doesn't exist, the test fails rather than making a real API call. This is a safety net: if someone adds a test without recording a cassette locally first, CI will catch it.

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

That's it. The first run hits the real API and saves the interaction. Every run after that uses the saved response.

## what a cassette looks like

The cassette is just a YAML file. Here's a simplified version of one from my project:

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

You can read exactly what the LLM decided to do. In this case, it responded with a tool call asking to run `mv *.txt ...`. The cassette captures the full HTTP exchange—headers, body, status code—so VCR can replay it identically.

Because the cassettes are human-readable, they double as documentation. If a test starts failing after you re-record, you can diff the old and new cassettes to see exactly how the LLM's behavior changed.

## testing the full agent flow

With VCR handling the HTTP layer, your test can focus on the actual behavior you care about: did the agent do the right thing?

A typical test for my tool looks like this:

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

The test reads like a description of the behavior: set up files, tell the agent what to do, check that it did it. VCR is invisible here—it's just making sure the LLM call returns the same recorded response every time.

This is the part that surprised me. I expected testing LLM agents to require a lot of mocking or special infrastructure. Instead, VCR lets you write normal integration tests. The LLM interaction is just another HTTP call.

## when to re-record

The `record: :once` strategy means your cassettes can go stale. If you change a prompt, the LLM might respond differently, but VCR will keep replaying the old response. Your test passes, but it's testing against outdated behavior.

There are a few strategies for this:

**Delete the cassette and re-run.** This is the simplest approach. Delete the YAML file, run the test, and VCR records a fresh interaction. I do this whenever I change a prompt or update the model.

**Use `record: :new_episodes`.** This mode records new requests but replays existing ones. Useful when you're adding new test cases but don't want to re-record everything.

**Periodic re-recording.** Some teams delete all cassettes on a schedule (monthly, per release) to make sure tests still pass against the real API. I haven't needed this yet, but it's a good idea if your external service changes frequently.

The key insight is that cassettes are disposable. They're fixtures, not source of truth. If something feels off, delete and re-record.

## what I learned

VCR solved my specific problem—testing an LLM agent without hitting the API every time—but the pattern is much more general. Any code that talks to an external HTTP service can benefit from this approach. Payment APIs, weather services, third-party auth providers, webhooks—anything where the response is out of your control.

The main thing I took away is that testing non-deterministic code doesn't require special frameworks or complex mocking strategies. You just need to make the non-deterministic part deterministic. VCR does this at the HTTP layer, which means it works regardless of what's on the other end—an LLM, a REST API, a GraphQL endpoint, whatever. You record reality once, then replay it forever.

It's not a perfect solution. Your tests can drift from actual API behavior if you don't re-record periodically. And if the API response format changes, you'll need new cassettes. But for the tradeoff of fast, deterministic, offline tests? I'll take it.
