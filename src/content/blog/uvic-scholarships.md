---
title: "shipping something people actually use"
description: "What it feels like when thousands of students start depending on something you built in your dorm room."
date: 2026-02-26
---

Someone DMed me on Instagram asking if the scholarship search was down. I didn't know this person. They didn't know me. They just knew the site existed and needed it to work.

That was the moment it stopped feeling like a side project.

## why i built it

UVic has over 1,300 undergraduate scholarships and hundreds of graduate awards. The university's website lets you browse them through what is essentially a filterable table. It works fine if you already know what you're looking for — if you know the name of the award, or the exact department, or the specific deadline. But if you're a first-year student trying to figure out what you even qualify for? You're scrolling through pages of results with no real way to explore.

I was that first-year student. I remember sitting in my dorm trying to find scholarships I could apply to, clicking through filters that didn't help, reading descriptions that didn't tell me what documents I actually needed. The information was all there, technically. It was just hard to use.

So I built the thing I wished existed: a single search page where you type a few words and immediately see everything relevant. The kind of tool where you type "engineering entrance" and it just shows you what you're looking for, matching across names, descriptions, departments, whatever. No pagination buttons, no dropdown menus for things that should be a search query.

I built it for myself first. That turned out to matter a lot.

## the invisible work

Here's something I didn't appreciate before this project: the distance between "the data exists" and "the data is usable" is enormous.

UVic's scholarship data comes from an API that returns HTML embedded in JSON. Scholarship names are wrapped in anchor tags, descriptions have `&amp;` and `&apos;` scattered everywhere, and line breaks are inconsistent. Before I could build anything, I had to write a cleanup function that strips tags, decodes entities, and normalizes whitespace. Not glamorous. Not the kind of thing you put in a demo. But if you skip it, every scholarship name renders with raw HTML.

It got worse. The undergraduate and graduate APIs have completely different structures. Undergrad scholarships come as flat rows with 8 fields. Graduate ones come grouped by department with 6 fields, and some information — like whether an application is required — isn't explicit. I had to infer it from the deadline text:

```javascript
const applicationRequired = deadlineLower.includes("no application required")
  ? false
  : deadlineLower === "" || deadlineLower === "n/a"
    ? null
    : true;
```

Two separate extraction scripts, two different data shapes, same destination. This is the kind of work that takes days and produces nothing visible. Nobody using the site will ever know about it, and that's the point.

I also used an LLM to enrich each scholarship with structured information — what documents you need, whether financial need matters, what year you should be in. The raw descriptions mention these things, but inconsistently, buried in paragraphs. The enrichment pipeline batches 15 scholarships at a time and extracts that into clean JSON. It took about 90 LLM calls to process everything, so I added resume support — save progress after every batch, pick up where you left off. I needed that more than once when things failed at batch 60.

## decisions i made because i was also a user

Being the target audience changed how I made decisions. Every feature started with something that annoyed me while I was using my own tool.

I added an "Auto" badge on scholarships that don't require an application. When you're scanning a list of 1,300 awards, immediately seeing which ones you're automatically considered for — without clicking into each card — saves real time. It's one conditional check and a small pill component. Tiny feature, big difference in how you browse.

Search updates as you type. No submit button, no loading spinner. The results just change. I used `useDeferredValue` so React keeps the input responsive even while filtering all 1,300+ scholarships on every keystroke. You can type "computer science" and watch the list narrow in real time.

I synced all filters to URL query parameters. If you set up a search for "engineering" with the "No application required" filter, you can copy the URL and send it to someone. They see exactly what you see. I added this because I kept wanting to share specific filtered views with friends and couldn't.

Keyboard shortcuts — press `/` to focus search, or just start typing. Escape blurs it. Backspace works even when the input isn't focused. Twenty lines of code in a keydown listener. But it makes the difference between a website and a tool.

## the launch

I didn't have a launch plan. I posted it in a few UVic Discord servers and group chats. Someone shared it on Reddit. A few people posted it on Instagram stories. Within a week, thousands of students had used it.

That sounds cool in retrospect. In the moment, it was mostly stressful.

The first thing that happened was someone found a scholarship with a garbled description — one of the HTML entity edge cases I'd missed in my cleanup function. Not a big deal technically, but embarrassing when real people are reading it. I pushed a fix in like ten minutes. Then someone pointed out that a few graduate scholarships were showing the wrong department because my extraction script was associating rows with the wrong group header. That one took longer to track down.

The feedback that surprised me most wasn't about bugs. People kept telling me they'd found scholarships they didn't know existed. Not obscure ones — awards they were eligible for that they'd just never seen because the university's interface made them hard to discover. One person said they found three scholarships they qualified for in five minutes. That felt different from anything I'd built before.

I also learned that "it works" and "it works for everyone" are not the same thing. Someone on a phone with slow data told me the initial load felt heavy. I hadn't really thought about payload size — the full enriched dataset is a few hundred KB of JSON, which is fine on campus WiFi but noticeable on a bus. That's the kind of thing you don't catch when you're testing on your own machine with a fast connection.

## what i learned

The biggest lesson was about the gap between building something and shipping something. I've built plenty of projects that work. Class assignments, hackathon demos, things I showed in job interviews. They all technically functioned. But none of them had to survive contact with real users who didn't care how they were built — they just needed them to work.

Shipping changes your relationship with code. When it's a portfolio project, a bug is something you'll fix later (or never). When thousands of people are using it, a bug is something you fix tonight. That pressure is clarifying. You stop caring about whether your code is elegant and start caring about whether it's correct.

I'd also do things differently if I started over. I'd think about mobile performance from day one instead of as an afterthought. I'd set up error tracking so I'd know about issues before someone DMs me. I'd probably write the data extraction as a single script with better validation instead of two scripts that evolved separately.

But honestly, the thing that mattered most wasn't any technical decision. It was that I built something I personally needed, which meant I had good instincts about what to prioritize. Every feature I added was something I wanted as a user. Every shortcut I took was something I noticed as a user. The best product decisions I made weren't clever — they were obvious, because I was frustrated by the same things everyone else was.

That's probably the most useful thing I can say about this project. Build something you actually want to use. The rest follows from there.
