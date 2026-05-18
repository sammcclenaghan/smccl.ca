---
title: "Fuzzy Git Staging in Rust"
description: "I always took fuzzy finders for granted. So I built a small Rust tool that uses fuzzy matching to stage git files."
date: 2025-10-16
---

I use fuzzy finders constantly. `fzf`, Telescope, and file pickers in editors all have the same small magic trick: you type a few characters and the file you meant appears near the top. Typing `mcon` can bring up `src/models/config.rs` without needing to type the full path.

I wanted to understand that a little better, so I built a small Rust tool for a workflow I do all the time: staging git files. The goal was not to invent a brand new fuzzy matching algorithm. It was to learn what makes fuzzy matching useful in practice and wire it into something I would actually use.

## The idea

At the simplest level, fuzzy matching checks whether the characters in a query appear inside a candidate in the same order, even if they are not beside each other. The query `mcon` matches `models/config.rs` because `m`, `c`, `o`, and `n` all appear in that order.

Finding matches is only the first half. The part that makes a fuzzy finder feel good is ranking. `src/models/config.rs` should beat `src/main.rs` for `mcon`, even though both contain some of the same letters. A matcher needs to score the alignment, not just say whether the query appears.

A few signals matter a lot:

- Characters that match at word boundaries should score higher.
- Consecutive matches should score higher.
- Matches after path separators like `/`, `_`, or `-` should score higher.
- Shorter paths are often better when the fuzzy score is tied.

## Implementation

Rather than writing the scoring algorithm myself, I used `nucleo-matcher`, the same matching engine used by Helix. That gave me the interesting parts of fuzzy matching without spending the whole project tuning scores by hand.

Rust also felt like a good fit for this kind of CLI tool. It is fast, the libraries are mature, and the final binary is easy to run from anywhere.

### Define the Matcher

The first step is to create a matcher and parse the query:

```rust
use nucleo_matcher::pattern::{CaseMatching, Normalization, Pattern};
use nucleo_matcher::{Config as MatcherConfig, Matcher};

let mut matcher = Matcher::new(MatcherConfig::DEFAULT.match_paths());
let pattern = Pattern::parse("mcon", CaseMatching::Ignore, Normalization::Smart);

let candidates = vec!["src/models/config.rs", "src/main.rs", "README.md"];
let results = pattern.match_list(&candidates, &mut matcher);
// results: [("src/models/config.rs", 98), ...]
```

The important part here is `match_paths()`. File paths have structure, and `/` should behave like a boundary. Matching `config` after `models/` should score differently than matching the same letters buried inside one long filename.

`Pattern::parse` also lets the query be case-insensitive and use smart Unicode normalization, which are the kinds of details I would rather get from a library than try to rebuild badly.

### Multi-Token Matching

Single-token matching gets you pretty far, but I wanted queries like this to work:

```text
*.rs mod conf
```

That should mean "Rust files that also fuzzy-match `mod` and `conf`." Each token should narrow the result set, not expand it, so I treated multi-token queries as an intersection. Each token produces a map from candidate index to score, and only candidates that appear in every token's result survive.

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

This gives the search AND semantics. By summing scores across tokens, a file that matches every part of the query well floats to the top.

### Glob Pattern Fallback

Sometimes fuzzy matching is the wrong tool. If someone types `*.rs`, they probably mean a glob. I added a simple fallback for tokens that contain `*`:

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

Glob matches get a flat score. Because the query logic is already based on intersections, glob and fuzzy tokens can mix naturally. `*.rs mod` means "files ending in `.rs` that also fuzzy-match `mod`."

### Interacting with Git

The fuzzy matching is only useful if the candidate list is right. For this tool, the candidates are files Git knows about: modified files, deleted files, renamed files, and untracked files.

I used the `git2` crate instead of shelling out to `git status` and parsing text:

```rust
let repo = Repository::open(repo_path)?;
let mut opts = StatusOptions::new();
opts.include_untracked(true)
    .include_ignored(false);

let statuses = repo.statuses(Some(&mut opts))?;
```

This made the project feel cleaner. Git status output is meant for people; `git2` gives the program structured data directly.

### Tiebreaking

Fuzzy scores alone are not enough. Two files can get the same score, especially in small repositories, so the tool needs deterministic tiebreaking. I used path length first, then lexicographic order:

```rust
.max_by(|(a_idx, a_score), (b_idx, b_score)| {
    a_score
        .cmp(b_score)
        .then_with(|| hay[*a_idx].len().cmp(&hay[*b_idx].len()).reverse())
        .then_with(|| hay[*a_idx].cmp(&hay[*b_idx]))
})
```

The length comparison is reversed because shorter paths should rank higher. The final comparison makes the ordering stable, which matters more than I expected. If a CLI tool gives different answers for the same query, it feels unreliable even when the matching is technically correct.

## What I learned

The biggest thing I learned is that fuzzy matching is not one algorithm so much as a pile of small taste decisions. What counts as a good match? Should path boundaries matter? Should shorter candidates win ties? Should multiple words mean OR or AND? None of those choices are huge on their own, but together they decide whether the tool feels obvious or annoying.

I also liked seeing how little code was needed once I picked the right libraries. `nucleo-matcher` handled the scoring, `globset` handled glob patterns, and `git2` handled repository state. The actual project became mostly about deciding how those pieces should compose.

If I kept pushing this further, I would probably add an interactive picker, previews, and better handling for ambiguous matches. But even as a small tool, it changed how I think about fuzzy finders. The magic is not that they match incomplete strings. The magic is that they rank the thing you meant before you finish typing it.
