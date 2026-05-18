---
title: "Building Your Own Resume in Typst"
description: "I got tired of editing LaTeX templates I didn't understand. So I learned Typst and built my resume from scratch."
date: 2025-01-15
math: true
---

I decided to update my resume today, just for fun. I originally wrote it in [Overleaf](https://www.overleaf.com/), the $\LaTeX$ compiler, but for a while I've been meaning to rewrite it on my own system so I can easily access it without an internet connection and be able to check it in to version-control.

When looking for other ways to create my resume, varying from [JSON resume](https://jsonresume.org/), to [RenderCV](https://github.com/rendercv/rendercv), I couldn't settle on one. I wanted immense customizability in order to have anything be possible, and turn it into yet another [Jake's Resume](https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs) clone.

And then I stumbled upon [this article](https://fransskarman.com/phd_thesis_in_typst.html), introducing me to [Typst](https://typst.app/), a modern system for typesetting documents. So, I decided to rewrite my whole resume in it in a day.

## Trying Typst

My first impression of Typst was that it felt much more approachable than $\LaTeX$. It still gives you the sense that you can control everything, but the syntax is much less intimidating, and when I don't know something, their docs were great to read.

It is also very fast. Being able to make a change and see the result almost immediately made it much easier to experiment with spacing, layout and little stylistic details. It was great to run the `typst watch` command and watch the document update in real time.

Another thing I liked was that Typst sits in a nice middle ground between markup and programming. You can write text naturally:

```typst
= Experience

I worked on *backend systems*, developer tooling, and internal platforms.
```

but when you want reusable pieces, those are easy to define too. For example, if I wanted a small helper from section headings or resume entries, I could write a function instead of repeating formatting everywhere:

```typst
#let resume-item(title, date, body) = [
	*#title* \h(1fr) #date
	#body
]

#resume-item(
	"Software Engineer"
	"2023-2025"
	[Worked on APIs, CI tooling, and infrastructure.]
)
```

It also makes global styling pleasantly straightforward. One feature I thought was especially elegant was Typst's `show` rules. They let you redefine how a kind of element should render throughout the document. For example, I can restyle every link like this:

```typst

#show link: item => box[
	#set text(blue)
	#underline(item)
]
```

It was great to define a rule on an object and now every instance of that object picks it up automatically.

## Building the resume

Once I got comfortable with the basics, the resume itself ended up being a handful of small reusable pieces.

For example, I defined a helper for section headings so every section looked consistent:

```typst
#let resume-section(title) = [
	#set text(12pt, weight: "bold")
	#title
	#line(length: 100%)
	#v(0.6em)
]
```

Then I could use it throughout the document without repeating the styling:

```typst
#resume-section("Experience")
#resume-section("Projects")
#resume-section("Education")
```

I also ended up making a small helper for contact information at the top of the page, where I wanted a row of links seperated by dots:

```typst
#let contact-item(label, url) = link(url)[#label]

#let contact-row(items) = [
	#for (index, item) in items.enumerate() [
		#item
		#if index < items.len() - 1 [ • ]
	]
]
```

That let me write the header much more cleanly:

```typst
#contact-row((
	contact-item("GitHub", "https://github.com/example"),
	contact-item("Email", "mailto:me@example.com"),
	contact-item("Site", "https://example.com"),
))
```

The final `resume.typ` file still reads mostly like a document, but it has just enough structure that I can reuse pieces, tweak the layout, and make global style changes without too much effort.

## Why I liked it more

The biggest improvement over my old setup was that the resume became a normal file in my project instead of something living in a browser tab. I could edit it locally, commit it to Git, and keep the source next to the exported PDF and SVG. That sounds small, but for a resume it matters: I want to be able to quickly change one line, regenerate the file, and know exactly what changed.

Typst also hit a nice balance between control and readability. With LaTeX templates, I often felt like I was carefully poking at someone else's machinery. In Typst, the pieces I wrote felt like my own. The helpers for sections, contact links, and entries made the document easier to maintain without turning it into a full application.

The fast feedback loop helped too. `typst watch` made spacing and layout changes feel interactive, which is exactly what I wanted for a resume. A few pixels of spacing can change the whole page, and being able to see those changes immediately made the process feel much less brittle.

Overall, Typst was a lot of fun to use. I started this mostly because I wanted a resume I could edit locally and keep in version control, but I ended up finding a tool I'd happily use again for other documents.

Oh, and the best part? It outputs natively to SVG.

<object data="/resume.svg" type="image/svg+xml" style="width: 100%; max-width: 612px; height: auto; border: 1px solid #e5e7eb; border-radius: 4px;"></object>
