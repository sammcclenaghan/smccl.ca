---
title: "I Rebuilt My Resume in Typst—Here's Why"
description: "I got tired of fighting LaTeX templates I didn't understand. So I rebuilt my entire resume from scratch in Typst, just to see if I could make something cleaner."
date: 2025-01-15
---

If you've ever used LaTeX to write a resume, especially from one of the commonly used templates, you've probably felt the following issues.

## Verboseness

Take a look at what a typical resume block looks like in LaTeX:

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

While every language syntax serves different purposes and has unique trade-offs in conciseness vs. expressiveness, it's kind of absurd that we need to close each begin with a corresponding end. And often we need to manually include boilerplate code for each section, like the vspace and the twocolentry and onecolentry environments. These don't convey the intent of the document, rather they are implementation details we don't want to deal with.

## Typst: the solution

So, realizing that LaTeX may be too complex of a tool for writing resumes, I decided to try out Typst. The first step is finding a suitable resume template. Fortunately, there are already some good-looking templates out there, so I decided to use a clean, two-file architecture separating template logic from content.

Here's what an equivalent experience entry looks like in my Typst template:

```typst
#exp_item(
  role: "Full Stack Developer, Intern",
  name: "Leanpub",
  location: "Victoria, BC",
  date: "May 2025 - Dec. 2025",
  [Rebuilt Dropbox API integration using AWS S3 and background job queues.],
  [Implemented progress tracking using Redis with reliable completion handling.]
)
```

The great thing about Typst is that it's a declarative language. This is, in my opinion, a huge improvement for the purposes of writing a resume or any document, as it allows me to focus on writing the content rather than how to use the tool.

## Building the template

The core document setup is pretty straightforward:

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

The `show` rules apply globally. Lists get slightly smaller text for visual hierarchy, and links get underlined with a 3pt offset so the underline doesn't collide with descenders.

## Section headings

For section headings, I used small caps with a full-width rule beneath:

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

The negative vertical spacing (`-4pt`) pulls the line tight against the heading. This is easy enough to modify if you want to change the spacing.

## Experience items with variadic arguments

The experience component accepts any number of bullet points using `..points`:

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

The `grid()` with fractional columns (`2fr`, `auto`) handles the two-column layout. Role and company left-aligned, date and location right-aligned. The `..points` gets spread into a `list()`. For those who know object-oriented programming, this is similar to the concept of encapsulation—the layout details are hidden in the template file.

## Project entries

Projects get a single-line header with `#h(1fr)` pushing the date to the right:

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

`#h(1fr)` is horizontal flex space, it fills the remaining width. This makes the header compact but still readable.

## Using the template

The actual resume file is pure content. I just import the template components and use them:

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

`#show: resume` applies the template to the entire document. Everything else is just calling the components with your data.

---

I've made a Typst resume template designed to be simple, easy to use, and very maintainable, taking advantage of Typst's clean syntax and declarative style. By separating the resume into two parts, the content and the layout design, this template becomes very easy to customize and maintain. When I want to edit the resume, I either want to edit the content or the layout design. In that case, I only need to edit one of the modules.

Oh! And the best thing? It can be an svg!!

<object data="/resume.svg" type="image/svg+xml" style="width: 100%; max-width: 612px; height: auto; border: 1px solid #e5e7eb; border-radius: 4px;"></object>
