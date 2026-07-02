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
      "A UVic course scheduler on Cloudflare Workers, D1, and Durable Objects — catalog search with live enrollment, timetable building, and real-time schedule sharing.",
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
    name: "git-fad",
    href: "https://github.com/sammcclenaghan/git-fad",
    description: "Git add with fuzzy searching, built in Rust.",
    featured: true,
  },
  {
    name: "job tracker",
    href: "https://github.com/sammcclenaghan/job_tracker",
    description:
      "A job application tracker with AI-powered job posting parsing and organization, built with Ruby on Rails.",
    featured: true,
  },
  {
    name: "photograph",
    href: "https://github.com/sammcclenaghan/photograph",
    description:
      "A photography portfolio and gallery app built with Next.js, React and PostgreSQL.",
  },
  {
    name: "uvic scholarships",
    href: "https://github.com/sammcclenaghan/uvic-scholarships",
    description:
      "A fast search tool for University of Victoria scholarships.",
  },
];
