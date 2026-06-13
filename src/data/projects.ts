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
    description: "git add with fuzzy searching, built in rust.",
    featured: true,
  },
  {
    name: "scheduler",
    href: "https://github.com/sammcclenaghan/scheduler",
    description:
      "a go backend api that serves university of victoria course data for building class schedules.",
    featured: true,
  },
  {
    name: "mildred",
    href: "https://github.com/sammcclenaghan/mildred",
    description:
      "an agent that runs plain-english rules for you, sandboxed with apple containers.",
    featured: true,
  },
  {
    name: "photograph",
    href: "https://github.com/sammcclenaghan/photograph",
    description:
      "a photography portfolio and gallery app built with next.js, react and postgresql.",
    featured: true,
  },
  {
    name: "job tracker",
    href: "https://github.com/sammcclenaghan/job_tracker",
    description:
      "a job application tracker with ai-powered job posting parsing and organization, built with ruby on rails.",
  },
  {
    name: "vikes scraper",
    href: "https://github.com/sammcclenaghan/vikes-scraper",
    description:
      "a cli tool that scrapes university of victoria's class data for searching and filtering classes, written in go.",
  },
  {
    name: "knox",
    href: "https://github.com/sammcclenaghan/knox",
    description: "an obsidian vault manager written in go.",
  },
  {
    name: "mango",
    href: "https://github.com/sammcclenaghan/mango",
    description: "a manga downloader built in go.",
  },
  {
    name: "text adventure",
    href: "https://github.com/sammcclenaghan/TextAdventure",
    description:
      "an event-driven game engine in java using factory and command patterns.",
  },
  {
    name: "uvic scholarships",
    href: "https://github.com/sammcclenaghan/uvic-scholarships",
    description:
      "a fast search tool for university of victoria scholarships.",
  },
  {
    name: "hecto.rs",
    href: "https://github.com/sammcclenaghan/hecto.rs",
    description: "a terminal text editor built to learn rust.",
  },
];
