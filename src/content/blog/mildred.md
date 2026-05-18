---
title: "Testing an LLM Tool With VCR"
description: "What I learned while testing Mildred, a small Ruby CLI that uses an LLM to generate shell commands."
date: 2026-02-16
---

While building [Mildred](https://github.com/sammcclenaghan/mildred), I ran into a testing problem I had not really dealt with before.

Mildred is a small Ruby CLI that takes file organization rules in English and asks an LLM to turn them into shell commands.

That meant the most important flow was also the most annoying one to test.

Send a prompt. Wait for the LLM. Get a tool call back. Run the command. Check that the files moved.

If every test hit the API for real, the suite would be slow, flaky, and more expensive than it needed to be.

I expected testing an LLM tool to require special mocking or custom infrastructure.

Instead, I ended up using [VCR](https://github.com/vcr/vcr), which is a very normal Ruby testing tool.

## The Problem

LLM APIs are awkward in tests for a few reasons.

They are slow. They cost money. They can return different answers for the same prompt.

Tool calling adds another layer.

The model does not just return text. It may ask the app to call a function, wait for the result, and then continue the conversation.

That sounds unusual, but at the HTTP boundary it is still just requests and responses.

That was the useful realization.

## Recording the Boundary

VCR records HTTP interactions the first time a test runs. After that, it replays the saved response from a YAML cassette.

Here is the basic setup I used:

```ruby
VCR.configure do |config|
  config.cassette_library_dir = "test/fixtures/vcr_cassettes"
  config.hook_into :webmock
  config.default_cassette_options = {
    record: ENV["CI"] ? :none : :once
  }
end
```

The important bit is `record`.

Locally, `:once` records a missing cassette and reuses it afterward.

In CI, `:none` makes missing cassettes fail immediately instead of quietly calling the real API.

That makes the test suite deterministic and keeps CI from spending tokens by accident.

## What the Test Looks Like

Once VCR handles the network, the test can focus on the behavior I actually care about.

```ruby
def test_moves_text_files_to_documents
  VCR.use_cassette("runner_move_files") do
    FileUtils.touch("test_workspace/notes.txt")
    FileUtils.touch("test_workspace/readme.txt")

    runner.execute("Move all .txt files to the documents folder")

    assert File.exist?("test_workspace/documents/notes.txt")
    assert File.exist?("test_workspace/documents/readme.txt")
  end
end
```

I like that this still reads like an integration test.

Set up files. Run the agent. Assert the result.

VCR is not pretending to be the LLM. It is just replaying the real HTTP conversation that happened once before.

The cassette itself is also useful to inspect.

```yaml
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

That made debugging easier than I expected.

If I re-record a cassette and the test changes, I can diff the YAML and see how the model response changed.

## The Catch

Cassettes can go stale.

If I change a prompt, Mildred might behave differently in real life while the test keeps replaying the old response.

So I treat cassettes as disposable fixtures.

When I change the prompt or tool schema, I delete the cassette and re-record it.

That is not perfect, but it is a tradeoff I understand.

## What I Learned

The lesson was not really about VCR.

It was about testing at the right boundary.

I do not need to mock the LLM's reasoning. I need to make the network interaction repeatable so I can test the code around it.

That feels like a useful pattern for AI projects in general.

A lot of new AI code still has boring old software boundaries: HTTP, files, processes, databases.

The newer part may be non-deterministic, but the boundary around it can often be made boring again.
