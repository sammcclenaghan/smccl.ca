---
title: "fuzzy matching from scratch in rust"
description: "I always took fuzzy finders for granted. So I dug into how fuzzy matching actually works and built something with it."
date: 2025-10-16
---

I have always used fuzzy finders like fzf in the terminal or Telescope in Neovim and ended up really loving them. They are probably my most used tools. In these tools, you type a few characters and the right file just appears. For example, typing `mcon` somehow brings `src/models/config.rs` to the top over `src/main.rs`.

I found all of this very interesting and dove deeper into how they actually work. In this post, we'll focus on the mechanics of fuzzy matching and use them to implement a small CLI tool that stages git files.

## Understanding Fuzzy Matching

The core idea of fuzzy matching is simple: given a query string and a list of candidates, find the candidates that contain the query's characters in order, even if they're not adjacent. So the query `mcon` matches `models/config.rs` because `m`, `c`, `o`, `n` all appear in that order.

The interesting part isn't finding matches — it's ranking them. A good fuzzy matcher assigns a score to each match based on how "good" the alignment is. 

### Components of a Good Match

- **Word Boundaries:** Characters that match at the start of a word score higher.
- **Consecutive Matches:** Consecutive character matches score higher.
- **Path Separators:** Matches after a path separator (`/`) or underscore (`_`) score higher because those are natural boundaries in file paths.

## Implementation

Now that we know the basics of fuzzy matching, we can implement it. Rather than writing a scoring algorithm from scratch, we'll use `nucleo-matcher`, which is the same engine that powers the Helix editor. It implements all the scoring heuristics we just discussed and is extremely fast.

We'll be using Rust in this blog post as it is very performant and has great libraries for this use case.

### Define the Matcher

First, we need to define our matcher and parse our query pattern.

```rust
use nucleo_matcher::pattern::{CaseMatching, Normalization, Pattern};
use nucleo_matcher::{Config as MatcherConfig, Matcher};

let mut matcher = Matcher::new(MatcherConfig::DEFAULT.match_paths());
let pattern = Pattern::parse("mcon", CaseMatching::Ignore, Normalization::Smart);

let candidates = vec!["src/models/config.rs", "src/main.rs", "README.md"];
let results = pattern.match_list(&candidates, &mut matcher);
// results: [("src/models/config.rs", 98), ...]
```

Here, we do a few things:
- We create a `Matcher` using `match_paths()`. This is important as it tells nucleo to treat `/` as a word boundary.
- We parse the query into a `Pattern`, ignoring case and using smart Unicode normalization.
- Finally, `match_list` returns a sorted list of `(candidate, score)` tuples. Candidates that don't match at all are excluded.

### Multi-Token Matching

Things get more interesting when you have multiple query tokens. Say you want to find a file that matches both `mod` and `conf`. Each token should narrow the results, not expand them.

We can implement this as an intersection. Each token produces a map from candidate index to score.

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

This gives us AND semantics, meaning every token must match for a candidate to survive. By summing the scores, a file that scores well on all tokens will rank the highest.

### Glob Pattern Fallback

Sometimes you don't want fuzzy matching at all. If someone types `*.rs`, they clearly want a glob pattern. We can add a fallback for this:

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

Glob matches get a flat score of 1. Because of the intersection logic, you can still mix them, like `*.rs mod` to find Rust files in the models directory.

### Interacting with Git

To make this work as a git subcommand, we need to interact with git programmatically. We can use the `git2` crate, which provides Rust bindings for libgit2.

```rust
let repo = Repository::open(repo_path)?;
let mut opts = StatusOptions::new();
opts.include_untracked(true)
    .include_ignored(false);

let statuses = repo.statuses(Some(&mut opts))?;
```

This is much cleaner than shelling out to `git status` and parsing the output. We can easily get unstaged and untracked files with a single API call.

### Tiebreaking

One thing to note is that fuzzy scores alone aren't enough. When two files have the same score, you need a tiebreaker. The right tiebreaker is usually path length.

```rust
.max_by(|(a_idx, a_score), (b_idx, b_score)| {
    a_score
        .cmp(b_score)
        .then_with(|| hay[*a_idx].len().cmp(&hay[*b_idx].len()).reverse())
        .then_with(|| hay[*a_idx].cmp(&hay[*b_idx]))
})
```

We reverse the length comparison because we want shorter paths to rank higher. We also add a final lexicographic comparison to ensure the ordering is fully deterministic.

### Conclusion

Building this tool taught me that fuzzy matching isn't just one thing — it's a family of techniques with different tradeoffs. The scoring heuristics are where all the magic lives, and they're surprisingly well-tuned in libraries like nucleo. 

I also learned that the Rust ecosystem for this kind of thing is really mature. Between nucleo for fuzzy matching, globset for glob patterns, and git2 for repository interaction, I spent almost no time fighting libraries.

Let me know if you guys would be interested in learning more about Rust CLI tools or exploring more advanced applications of fuzzy matching algorithms.

Thank you for reading this and I hope you liked it!
