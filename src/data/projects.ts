export interface Project {
  name: string;
  href: string;
  description: string;
  featured?: boolean;
}

export const projects: Project[] = [
  {
    name: "git-fad",
    href: "https://github.com/sammcclenaghan/git-fad",
    description: "Git add with fuzzy searching, built in Rust.",
    featured: true,
  },
  {
    name: "scheduler",
    href: "https://github.com/sammcclenaghan/scheduler",
    description:
      "A Go backend API that serves University of Victoria course data for building class schedules.",
    featured: true,
  },
  {
    name: "mildred",
    href: "https://github.com/sammcclenaghan/mildred",
    description:
      "An agent that runs plain-English rules for you, sandboxed with Apple containers.",
    featured: true,
  },
  {
    name: "photograph",
    href: "https://github.com/sammcclenaghan/photograph",
    description:
      "A photography portfolio and gallery app built with Next.js, React and PostgreSQL.",
    featured: true,
  },
  {
    name: "job tracker",
    href: "https://github.com/sammcclenaghan/job_tracker",
    description:
      "A job application tracker with AI-powered job posting parsing and organization, built with Ruby on Rails.",
  },
  {
    name: "vikes scraper",
    href: "https://github.com/sammcclenaghan/vikes-scraper",
    description:
      "A CLI tool that scrapes University of Victoria's class data for searching and filtering classes, written in Go.",
  },
  {
    name: "knox",
    href: "https://github.com/sammcclenaghan/knox",
    description: "An Obsidian vault manager written in Go.",
  },
  {
    name: "mango",
    href: "https://github.com/sammcclenaghan/mango",
    description: "A manga downloader built in Go.",
  },
  {
    name: "text adventure",
    href: "https://github.com/sammcclenaghan/TextAdventure",
    description:
      "An event-driven game engine in Java using factory and command patterns.",
  },
  {
    name: "uvic scholarships",
    href: "https://github.com/sammcclenaghan/uvic-scholarships",
    description:
      "A fast search tool for University of Victoria scholarships.",
  },
  {
    name: "hecto.rs",
    href: "https://github.com/sammcclenaghan/hecto.rs",
    description: "A terminal text editor built to learn Rust.",
  },
];
