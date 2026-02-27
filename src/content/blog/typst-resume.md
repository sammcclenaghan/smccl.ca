---
title: "building your own resume in typst"
description: "I got tired of editing LaTeX templates I didn't understand. So I learned Typst and built my resume from scratch."
date: 2025-01-15
---

Every CS student I know has the same resume origin story. At some point you find a LaTeX template on GitHub, clone it, swap in your name and experience, and compile it. It looks great. It works perfectly — as long as you never touch the layout.

The moment you try to move a section, add a column, or rearrange anything structural, you're in `\vspace` hell. I wanted to put my projects above my education. Twenty minutes later I'm staring at a half-page gap that appeared out of nowhere and I have no idea which of the fourteen `\vspace` commands is responsible.

Here's what a typical experience entry looks like in the LaTeX template I was using:

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

I stared at this for a long time before I realized what actually bothered me. Every `\begin` needs a `\end`. Every section needs manual `\vspace` to control spacing. But the real problem is that `twocolentry` and `onecolentry` don't tell you *what* you're writing — they tell you *how* it's laid out. The template is full of layout commands, and your actual content is just wedged in between them.

When your resume template is more about layout commands than content, something has gone wrong.

## why templates are the problem

I think the issue isn't LaTeX itself — it's that most of us never actually learn it. We grab a template, edit the parts we recognize, and avoid everything else. I couldn't tell you what `\begin{twocolentry}` actually does under the hood. I just know that if I delete it, things break.

This means every time I want to make a structural change, I'm editing layout commands I don't understand. I'm not writing my resume, I'm debugging someone else's template. And the worst part is that it works *just well enough* that you never feel justified spending time on a real fix. You just add another `\vspace` and move on.

I decided I wanted to actually understand the tool I was using to typeset my resume. Not find a better template — build my own, from scratch, in something I could learn.

## trying typst

Typst is a newer typesetting language that's been getting traction as a LaTeX alternative. I'd seen it mentioned a few times and figured this was a good excuse to try it. My goal wasn't to become a Typst expert — it was to rebuild my resume in a way where I understood every single line.

Here's what the same experience entry looks like in Typst:

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

The first time I wrote this, I actually stopped and re-read it. This reads like what it *is*: a job entry with a role, company, location, date, and bullet points. There's no layout boilerplate. The `exp_item` function handles all of that — I just pass it content. You're writing `role:` and `name:`, not `\textbf{}` inside `\begin{twocolentry}`.

This is probably the first typesetting language I actually understand.

## building the template from scratch

I started with the document-level setup. Typst uses `set` rules for defaults and `show` rules for transformations — I discovered that both apply globally once you define them, which makes the top of a template feel more like a config file than a program:

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

I tried a few things here. Lists get slightly smaller text so bullet points don't compete visually with headings. Links get underlined with a 3pt offset so the underline doesn't collide with descenders on letters like `g` and `y`. These are small design decisions, but they're mine — I understand why they're there because I put them there.

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

The `v(-4pt)` pulls the horizontal rule tight against the heading text. Without it, there's a gap that looks unintentional. This is the kind of thing that would've taken me 30 minutes to figure out in LaTeX — in Typst, I just tried negative values until it looked right. There's something freeing about a language where you can just guess and immediately see what happens.

## the grid layout

The experience item component is where Typst's design really clicked for me. I needed a two-column layout — role and company on the left, date and location on the right — with bullet points underneath. In LaTeX, this was `twocolentry` with `highlights` nested inside. In Typst, I built it myself:

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

The `(2fr, auto)` column split means the left side takes up most of the width, and the right side takes only what it needs. `fr` stands for fractional units — it's like flex space. The `..points` parameter collects any number of content blocks and spreads them into a `list()`. So when I call `exp_item` with two bullet points, they just become a regular bulleted list. No `\begin{highlights}`, no `\end{highlights}`.

I discovered the `..` spread syntax by accident while reading the Typst docs and it immediately made sense. It's the same idea as JavaScript spread, which was way more intuitive to me than anything I'd encountered in LaTeX.

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

`#h(1fr)` is horizontal flex space — it fills whatever width is left over. The project name and skills sit on the left, the date gets pushed to the right, and I never have to think about column widths. The difference is that I know *why* it works, because I wrote it.

## two files

The payoff of building the template myself is that my resume is now split cleanly into two files. `template.typ` is pure layout — every component, every design decision. `resume.typ` is pure content:

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

`#show: resume` applies the template to the entire document. Everything after that is just calling components with my data. When I want to add a new job, I open `resume.typ` and add another `exp_item`. When I want to change how headings look, I open `template.typ` and edit `resume_heading`. Neither file is long. Neither file is confusing. I never have to hold both layout and content in my head at the same time.

There's something different about using a tool you built yourself. With the LaTeX template, I was always nervous about changing things — what if I break the spacing? What if some environment I don't understand stops working? With this Typst setup, I understand every line because I wrote every line. When something looks off, I know exactly where to fix it. That's not because Typst is magic — it's because I actually learned it instead of copying someone else's work and hoping for the best.

Oh, and the best part? It can be an SVG.

<object data="/resume.svg" type="image/svg+xml" style="width: 100%; max-width: 612px; height: auto; border: 1px solid #e5e7eb; border-radius: 4px;"></object>
