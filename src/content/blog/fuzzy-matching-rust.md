---
title: "fuzzy matching from scratch in rust"
description: "I always took fuzzy finders for granted. So I dug into how fuzzy matching actually works and built something with it."
date: 2025-10-16
---

Every time I open a fuzzy finder — fzf in the terminal, Telescope in Neovim, the file picker in Helix — I type a few characters and the right file just appears. I never thought about *how* it appears. I type `mcon`, and somehow `src/models/config.rs` floats to the top over `src/main.rs` and `README.md`. It feels like magic, and I'd been treating it like magic for years without ever asking how it actually works.

I wanted to understand the mechanics. Not just "it matches substrings" — I wanted to know how a fuzzy matcher decides that one match is *better* than another, how it scores candidates, and what makes typing three characters enough to find a file in a project with hundreds of them. I ended up building a small CLI tool that uses fuzzy matching to stage git files, and in the process I learned a lot more than I expected.

## what fuzzy matching actually is

The core idea is simple: given a query string and a list of candidates, find the candidates that contain the query's characters in order, even if they're not adjacent. So the query `mcon` matches `models/config.rs` because `m`, `c`, `o`, `n` all appear in that order — the `m` from `models`, then `c`, `o`, `n` from `config`. It also matches `my_connection.rs` and probably a dozen other paths. The interesting part isn't finding matches — it's *ranking* them.

A good fuzzy matcher assigns a score to each match based on how "good" the alignment is. Characters that match at the start of a word score higher. Consecutive character matches score higher. Matches after a path separator or underscore score higher because those are natural word boundaries in file paths. The query `mcon` should rank `models/config.rs` above `some_macro_notes.txt` even though both contain the same characters in the same order, because the first one has matches at word boundaries.

I had no idea any of this was happening. I just assumed fuzzy finders were doing some kind of substring search with extra steps.

## nucleo — the engine behind helix

Rather than writing a scoring algorithm from scratch, I used [nucleo-matcher](https://crates.io/crates/nucleo-matcher), which is the same fuzzy matching engine that powers the Helix editor's file picker. It implements the kind of scoring I described above — word boundary bonuses, consecutive match bonuses, gap penalties — and it's fast enough to score thousands of candidates interactively.

The API is straightforward. You create a `Matcher` with a config, parse your query into a `Pattern`, and call `match_list` to score every candidate:

```rust
use nucleo_matcher::pattern::{CaseMatching, Normalization, Pattern};
use nucleo_matcher::{Config as MatcherConfig, Matcher};

let mut matcher = Matcher::new(MatcherConfig::DEFAULT.match_paths());
let pattern = Pattern::parse("mcon", CaseMatching::Ignore, Normalization::Smart);

let candidates = vec!["src/models/config.rs", "src/main.rs", "README.md"];
let results = pattern.match_list(&candidates, &mut matcher);
// results: [("src/models/config.rs", 98), ...]
```

`match_paths()` is important — it tells nucleo to treat `/` as a word boundary, which means path separators boost the score when a match character falls right after one. `CaseMatching::Ignore` makes queries case-insensitive, and `Normalization::Smart` handles Unicode normalization so accented characters match their base forms.

The thing that surprised me is that `match_list` returns a sorted list of `(candidate, score)` tuples. Candidates that don't match at all are excluded entirely. The score is a `u32` — higher is better. You don't have to write any comparison logic yourself for single-token queries; nucleo handles all of it.

## multi-token matching

Things get more interesting when you have multiple query tokens. Say you want to find a file that matches both `mod` and `conf` — you're looking for something in the models directory that's related to config. Each token should narrow the results, not expand them.

I implemented this as an intersection. Each token produces a map from candidate index to score. For the first token, the map is just the initial results. For each subsequent token, I keep only candidates that appear in *both* the existing map and the new token's matches, summing their scores:

```rust
let mut cumulative: HashMap<usize, u32> = HashMap::new();
let mut first = true;

for tok in &tokens {
    let tok_map = token_to_index_scores(tok, &hay_refs, &index_map, &mut matcher);

    if first {
        cumulative = tok_map;
        first = false;
    } else {
        cumulative = cumulative
            .into_iter()
            .filter_map(|(idx, total)| tok_map.get(&idx).map(|s| (idx, total + s)))
            .collect();
    }
}
```

This gives you AND semantics — every token must match for a candidate to survive. And the cumulative score means candidates that score well on *all* tokens rank highest. If you type `mod conf`, a file like `models/config.rs` gets the score from matching `mod` plus the score from matching `conf`, and that combined score beats a file that only weakly matches both.

## when fuzzy isn't what you want

Sometimes you don't want fuzzy matching at all. If someone types `*.rs`, they clearly want a glob pattern, not a fuzzy search for the characters `*`, `.`, `r`, `s`. So I added a fallback: if a token contains `*`, treat it as a glob instead of a fuzzy query.

```rust
let is_glob = token.contains('*');

if is_glob {
    let glob = Glob::new(token)?;
    let gm = glob.compile_matcher();
    hay_refs.iter()
        .filter(|p| gm.is_match(p))
        .map(|p| (index_map[p], 1u32))
        .collect()
} else {
    // fuzzy match with nucleo
}
```

Glob matches get a flat score of 1 since there's no concept of "how well" something matches a glob — either it matches or it doesn't. They still participate in the intersection logic with fuzzy tokens, so you can write something like `*.rs mod` to find Rust files in the models directory.

## not shelling out to git

I wanted this to work as a git subcommand (`git fad`), which meant interacting with git programmatically. My first instinct was `std::process::Command` — just shell out to `git status` and parse the output. But then I found [git2](https://crates.io/crates/git2), which is a set of Rust bindings for libgit2, and it's much cleaner.

Getting unstaged and untracked files is a single API call:

```rust
let repo = Repository::open(repo_path)?;
let mut opts = StatusOptions::new();
opts.include_untracked(true)
    .include_ignored(false);

let statuses = repo.statuses(Some(&mut opts))?;
```

Each status entry has flags you can check — `WT_NEW` for untracked, `WT_MODIFIED` for modified, `WT_DELETED` for deleted. Staging a file is similarly direct: open the index, add the path, write it back. No string parsing, no worrying about `git status` output format changing between versions. Turns out there's a whole world of git tooling that doesn't involve parsing CLI output, and I'd never explored it.

## tiebreaking

One thing I learned the hard way: fuzzy scores alone aren't enough. When two files have the same score, you need a tiebreaker, and the right tiebreaker is path length. Shorter paths should win because they're usually closer to what you meant — if `config.rs` and `src/utils/old/config.rs` both score 85 for the query `conf`, you almost certainly want the first one.

```rust
.max_by(|(a_idx, a_score), (b_idx, b_score)| {
    a_score
        .cmp(b_score)
        .then_with(|| hay[*a_idx].len().cmp(&hay[*b_idx].len()).reverse())
        .then_with(|| hay[*a_idx].cmp(&hay[*b_idx]))
})
```

The `reverse()` on the length comparison is because we want shorter paths to rank higher, but `max_by` picks the largest value. Without this, the tiebreaker consistently picks the deepest-nested file, which is almost never what you want. I added a final lexicographic comparison too, just so the ordering is fully deterministic — same input always gives same output.

## what I learned

The biggest takeaway is that fuzzy matching isn't one thing — it's a family of techniques with different tradeoffs. The scoring heuristics (word boundary bonuses, consecutive bonuses, gap penalties) are where all the magic lives, and they're surprisingly well-tuned in libraries like nucleo. I went in thinking fuzzy matching was basically "substring search but you can skip characters" and came out understanding that the ranking algorithm is the entire product.

I also learned that the Rust ecosystem for this kind of thing is really mature. Between nucleo for fuzzy matching, globset for glob patterns, and git2 for repository interaction, I spent almost no time fighting libraries and almost all my time thinking about the actual logic. That's not always my experience with Rust.

The tool itself is simple — it takes query tokens, fuzzy-matches them against your unstaged files, and stages the best match. But building it taught me to stop treating the tools I use every day as black boxes. The next time I open a fuzzy finder and the right file appears at the top, I'll know why.
