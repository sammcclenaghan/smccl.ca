export interface Project {
  name: string;
  href: string;
  description: string;
  featured?: boolean;
}

export const projects: Project[] = [
  {
    name: "photograph",
    href: "https://github.com/sammcclenaghan/photograph",
    description:
      "a photography portfolio and gallery app built with next.js, react and postgresql.",
    featured: true,
  },
  {
    name: "vikes scraper",
    href: "https://github.com/sammcclenaghan/vikes-scraper",
    description:
      "a cli tool that scrapes university of victoria's class data and provides an interface for searching and filtering classes.",
    featured: true,
  },
  {
    name: "job tracker",
    href: "https://github.com/sammcclenaghan/job-tracker",
    description:
      "a job application tracker with ai-powered cover letter generation and job posting parsing, built with ruby on rails and tailwind css.",
    featured: true,
  },
  {
    name: "text adventure",
    href: "https://github.com/sammcclenaghan/TextAdventure",
    description:
      "event-driven game engine in Java with Factory and Command patterns.",
    featured: true,
  },
  {
    name: "git-fad",
    href: "https://github.com/sammcclenaghan/git-fad",
    description: "git add with fuzzy searching capabilities.",
  },
  {
    name: "mango",
    href: "https://github.com/sammcclenaghan/mango",
    description: "a manga downloader built in Go.",
  },
  {
    name: "mildred",
    href: "https://github.com/sammcclenaghan/mildred",
    description: "a more personal maid.",
  },
];
