---
title: "Shipping Something People Actually Use"
description: "What it feels like when thousands of students start depending on something you built in your dorm room."
date: 2026-02-26
---

UVic has over 1,300 undergraduate scholarships and hundreds of graduate awards.

The university's website lets you browse them through what is essentially a massive, slow, filterable table. It works fine if you already know exactly what you're looking for. But if you're a first-year student trying to figure out what you even qualify for? You're scrolling through pages of results with no real way to explore.

I was that first-year student.

I remember sitting in my dorm, trying to find scholarships I could apply to. I was clicking through filters that didn't help, reading descriptions that didn't tell me what documents I actually needed. The information was technically there. It was just impossibly hard to use.

So I built the thing I wished existed.

A single search page. You type a few words, and you immediately see everything relevant. You type "engineering entrance" and it just *shows you what you're looking for*, matching across names, descriptions, departments, everything.

No pagination buttons. No dropdown menus for things that should obviously be a search query.

I built it for myself first. That turned out to matter a lot.

## The Invisible Work

Here's something I didn't appreciate before this project: the distance between "the data exists" and "the data is usable" is enormous.

UVic's scholarship data comes from an API that returns HTML embedded inside JSON. Scholarship names are wrapped in anchor tags. Descriptions have `&amp;` and `&apos;` scattered everywhere. Line breaks are completely inconsistent.

Before I could build *anything*, I had to write a cleanup function that strips tags, decodes entities, and normalizes whitespace. It isn't glamorous. It isn't the kind of thing you put in a demo. But if you skip it, your app looks like garbage.

It got worse.

The undergraduate and graduate APIs have completely different structures. Undergrad scholarships come as flat rows with 8 fields. Graduate ones come grouped by department with 6 fields, and some critical information—like whether an application is required—isn't even explicit. I had to infer it from the deadline text:

```javascript
const applicationRequired = deadlineLower.includes("no application required")
  ? false
  : deadlineLower === "" || deadlineLower === "n/a"
    ? null
    : true;
```

Two separate extraction scripts. Two different data shapes. Same destination.

This is the kind of work that takes days and produces nothing visibly new. Nobody using the site will ever know about it, and that is exactly the point.

I also threw an LLM at it.

I used it to enrich each scholarship with structured information—what documents you need, whether financial need matters, what year you should be in. The raw descriptions mention these things inconsistently, buried deep in paragraphs. The enrichment pipeline batches 15 scholarships at a time and extracts clean JSON.

It took about 90 LLM calls to process everything. I added resume support because things kept failing at batch 60.

## Decisions I Made Because I Was A User

Being the target audience changed how I made decisions. Every single feature started with something that annoyed me while I was using my own tool.

**The "Auto" Badge:** I added a badge on scholarships that don't require an application. When you're scanning 1,300 awards, immediately seeing which ones you're automatically considered for saves a massive amount of time. One conditional check. One small pill component. Huge difference in UX.

**Instant Search:** Search updates as you type. No submit button. No loading spinner. The results just change. I used `useDeferredValue` in React to keep the input perfectly responsive while filtering all 1,300+ scholarships on every keystroke.

**URL Syncing:** I synced all filters to URL query parameters. If you set up a search for "engineering" with the "No application required" filter, you can copy the URL and send it to a friend, and they see exactly what you see. I added this purely because I kept wanting to share specific views and couldn't.

**Keyboard Shortcuts:** Press `/` to focus search, or just start typing. Escape blurs it. Twenty lines of code in a keydown listener. It makes the difference between a website and a *tool*.

## The Launch

I didn't have a launch plan.

I posted it in a few UVic Discord servers and group chats. Someone shared it on Reddit. A few people posted it on Instagram stories.

Within a week, thousands of students had used it.

That sounds cool in retrospect. In the moment, it was incredibly stressful.

The first thing that happened was someone found a scholarship with a garbled description. I had missed an HTML entity edge case. Not a big deal technically, but embarrassing when real people are reading it. I pushed a fix in ten minutes.

Then someone pointed out graduate scholarships showing the wrong department because my script associated rows with the wrong group header. That one took longer.

The feedback that surprised me most wasn't about bugs. It was people telling me they found scholarships they didn't know existed. Not obscure ones—awards they were highly eligible for, but had never seen because the university's interface made them impossible to discover.

One person found three scholarships they qualified for in five minutes.

That felt different from anything I'd ever built before.

I also learned that "it works" and "it works for everyone" are not the same thing. Someone on a phone with slow data told me the initial load felt heavy. I hadn't thought about payload size. The full enriched dataset is a few hundred KB of JSON. That's fine on campus WiFi, but painful on a bus.

## What I Learned

The biggest lesson was the gap between building something and *shipping* something.

I've built plenty of projects that work. Class assignments, hackathons, interview demos. They all technically functioned. But none of them had to survive contact with real users who didn't care how it was built—they just needed it to work.

Shipping changes your relationship with code.

When it's a portfolio project, a bug is something you'll fix later. When thousands of people are relying on it, a bug is something you fix tonight.

That pressure is clarifying. You stop caring about whether your code is elegant and start caring about whether it is correct.

If I started over, I'd do things differently. I'd think about mobile performance from day one. I'd set up error tracking so I know about issues before I get an Instagram DM.

But honestly, the thing that mattered most wasn't a technical decision.

It was that I built something I personally needed. I had perfectly tuned instincts about what to prioritize. Every feature was something I wanted. The best product decisions I made weren't clever—they were obvious.

Build something you actually want to use. The rest follows from there.