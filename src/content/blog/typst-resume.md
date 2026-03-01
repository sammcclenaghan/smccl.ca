---
title: "Building Your Own Resume in Typst"
description: "I got tired of editing LaTeX templates I didn't understand. So I learned Typst and built my resume from scratch."
date: 2025-01-15
---

Every CS student I know has the exact same resume origin story.

You find a LaTeX template on GitHub. You clone it. You swap in your name and experience, and you compile it. It looks great. 

It works perfectly—as long as you never, ever touch the layout.

The moment you try to move a section, add a column, or rearrange anything structural, you're in `\vspace` hell. I wanted to put my projects above my education. Twenty minutes later, I'm staring at a massive half-page gap that appeared out of nowhere, and I have absolutely no idea which of the fourteen `\vspace` commands is responsible.

Here's what a typical experience entry looks like in my old LaTeX template:

```latex
\begin{twocolentry}{June 2005 – Aug 2007}
  \textbf{Software Engineer}, Apple -- Cupertino, CA\end{twocolentry}

\vspace{0.10 cm}
\begin{onecolentry}
    \begin{highlights}
        \item Reduced time to render user buddy lists by 75%
        \item Integrated iChat with Spotlight Search
    \end{highlights}
\end{onecolentry}

\vspace{0.2 cm}
```

I stared at this for a long time before I realized what was actually bothering me.

Every `\begin` needs an `\end`. Every section needs manual `\vspace` to control spacing. But the real problem? `twocolentry` and `onecolentry` don't tell you *what* you're writing. They tell you *how* it's laid out.

The template is full of layout commands, and your actual content is just wedged in between them.

When your resume template is more about layout commands than your actual content, something has gone terribly wrong.

## Why Templates Are The Problem

The issue isn't LaTeX itself. It's that most of us never actually learn it.

We grab a template, edit the strings we recognize, and avoid touching everything else. I couldn't tell you what `\begin{twocolentry}` actually does under the hood. I just know that if I delete it, the whole document shatters.

This means every time I make a structural change, I'm editing layout commands I don't understand. I'm not writing my resume. I'm debugging someone else's template. And the worst part is that it works *just well enough* that you never feel justified spending time on a real fix. You just add another `\vspace` and move on.

I decided I wanted to actually understand the tool typesetting my resume.

Not find a better template. Build my own. From absolute scratch.

## Trying Typst

Typst is a newer typesetting language getting massive traction as a modern LaTeX alternative. I figured this was the perfect excuse to try it. My goal wasn't to become an expert—it was to rebuild my resume in a way where I understood every single line.

Here's what that exact same experience entry looks like in Typst:

```typst
#exp_item(
  role: "Full Stack Developer, Intern",
  name: "Leanpub",
  location: "Remote (Victoria, BC)",
  date: "May 2025 - Dec. 2025",
  [Rebuilt Dropbox API integration using AWS S3 and background job queues.],
  [Implemented progress tracking using Redis with reliable completion handling.]
)
```

The first time I wrote this, I actually stopped and re-read it.

This reads like what it *is*: a job entry. It has a role, company, location, date, and bullet points. There is zero layout boilerplate. The `exp_item` function handles all of that. I just pass it data.

You're writing `role:` and `name:`, not `\textbf{}` inside `\begin{twocolentry}`.

This is probably the first typesetting language I've ever actually understood.

## Building The Template

I started with the document-level setup. Typst uses `set` rules for defaults and `show` rules for transformations. Both apply globally once defined, which makes the top of a template feel more like a config file than a program:

```typst
#let resume(body) = {
  set list(indent: 1em)
  show list: set text(size: 0.92em)
  show link: underline
  show link: set underline(offset: 3pt)

  set page(
    paper: "us-letter",
    margin: (x: 0.5in, y: 0.5in)
  )

  set text(
    size: 11pt,
    font: "New Computer Modern",
  )

  body
}
```

I made a few deliberate design choices here. Lists get slightly smaller text so bullet points don't compete with headings. Links get a 3pt underline offset so it doesn't collide with descenders on letters like `g` and `y`.

These are small decisions, but they are *mine*. I understand why they're there because I put them there.

Section headings needed a clean separator. I tried a few approaches and landed on small caps with a full-width rule underneath:

```typst
#let resume_heading(txt) = {
  show heading: set text(size: 0.92em, weight: "regular")

  block[
    = #smallcaps(txt)
    #v(-4pt)
    #line(length: 100%, stroke: 1pt + black)
  ]
}
```

That `v(-4pt)` pulls the horizontal rule tight against the text. Without it, there's a weird gap. In LaTeX, figuring that out would have taken me 30 minutes. In Typst, I just tried negative values until it looked right.

There is something incredibly freeing about a language where you can just guess and immediately see what happens.

## The Grid Layout

The experience item component is where Typst's design truly clicked for me.

I needed a two-column layout. Role and company on the left, date and location on the right, with bullet points underneath. In LaTeX, this was `twocolentry` with `highlights` nested inside.

In Typst, I just built it myself:

```typst
#let exp_item(
  name: "Sample Workplace",
  role: "Worker",
  date: "June 1837 - May 1845",
  location: "Foo, BA",
  ..points
) = {
  set block(above: 0.7em, below: 1em)
  pad(left: 1em, right: 0.5em, box[
    #grid(
      columns: (2fr, auto),
      align(left)[
        *#role* \
        _#name _
      ],
      align(right)[
        #date \
        _#location _
      ]
    )
    #list(..points)
  ])
}
```

The `(2fr, auto)` column split is beautiful. The left side takes up most of the width, and the right side takes only exactly what it needs.

`fr` stands for fractional units—it's basically flex space. And the `..points` parameter collects any number of content blocks and spreads them straight into a `list()`. When I call `exp_item` with two bullet points, they just become a list. No `\begin{highlights}` in sight.

Project entries are even simpler. They use a single-line header with `#h(1fr)` to push the date to the right edge:

```typst
#let project_item(
  name: "Example Project",
  skills: "Go, React, TypeScript",
  date: "2025",
  ..points
) = {
  set block(above: 0.7em, below: 1em)
  pad(left: 1em, right: 0.5em, box[
    *#name* | _#skills _ #h(1fr) #date
    #list(..points)
  ])
}
```

`#h(1fr)` is horizontal flex space. The project sits on the left, the date gets forcefully pushed to the right, and I never have to think about fixed column widths again. I know exactly why it works, because I wrote it.

## Two Files

The massive payoff of building this myself is that my resume is now split cleanly into two files.

`template.typ` is pure layout—every component, every design decision. `resume.typ` is pure content:

```typst
#import "template.typ": resume, header, resume_heading, edu_item, exp_item, project_item, skill_item

#show: resume

#header(
  name: "Sam McClenaghan",
  phone: "780-221-1327",
  email: "sam@aream.ca",
  linkedin: "linkedin.com/in/sam-mcclenaghan",
  site: "github.com/sammcclenaghan",
)

#resume_heading[Education]
#edu_item(
  name: "University of Victoria",
  degree: "Bachelor of Science in Computer Science",
  location: "Victoria, BC",
  date: "Sept 2023 - April 2027"
)
```

`#show: resume` applies the template globally. Everything after that is just me calling components with data.

When I want to add a new job, I open `resume.typ` and add an `exp_item`. When I want to change how headings look, I open `template.typ`. Neither file is long. Neither file is confusing. I never have to hold both layout and content in my head at the same time again.

There's something incredibly satisfying about using a tool you fully understand.

When something looks off, I know exactly where to fix it. Not because Typst is magic, but because I actually learned it instead of copying someone else's work and praying it compiles.

Oh, and the best part? It outputs natively to SVG.

<object data="/resume.svg" type="image/svg+xml" style="width: 100%; max-width: 612px; height: auto; border: 1px solid #e5e7eb; border-radius: 4px;"></object>