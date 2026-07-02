export interface Project {
  name: string;
  href: string;
  description: string;
  featured?: boolean;
}

export const projects: Project[] = [
  {
    name: "courseflow",
    href: "https://courseflow.smccl.ca",
    description:
      "A UVic course scheduler on Cloudflare Workers, D1, and Durable Objects.",
    featured: true,
  },
  {
    name: "mildred",
    href: "https://github.com/sammcclenaghan/mildred",
    description:
      "Plain-English file rules, run by an LLM in a container sandbox.",
    featured: true,
  },
  {
    name: "git-fad",
    href: "https://github.com/sammcclenaghan/git-fad",
    description: "Git add with fuzzy searching, built in Rust.",
    featured: true,
  },
  {
    name: "job tracker",
    href: "https://github.com/sammcclenaghan/job_tracker",
    description: "A Rails job tracker that parses postings with AI.",
    featured: true,
  },
  {
    name: "photograph",
    href: "https://github.com/sammcclenaghan/photograph",
    description: "A photography portfolio and gallery built with Next.js.",
  },
  {
    name: "uvic scholarships",
    href: "https://github.com/sammcclenaghan/uvic-scholarships",
    description:
      "A fast search tool for University of Victoria scholarships.",
  },
];
