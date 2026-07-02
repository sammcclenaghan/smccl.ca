import fs from "node:fs/promises";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

// Social cards, generated at build time in the site's own voice: warm
// white ground, Geist type, the accent dot as the only mark. One card
// per post plus a default for every other page.

const WIDTH = 1200;
const HEIGHT = 630;

// Light-theme palette from global.css
const colors = {
  bg: "#ffffff",
  tx1: "hsl(30, 14%, 15%)",
  tx2: "hsl(32, 8%, 38%)",
  tx3: "hsl(32, 6%, 55%)",
  accent: "#3b82f6",
};

const fontDir = path.resolve("src/assets/og");
const fonts = [
  {
    name: "Geist",
    weight: 400 as const,
    style: "normal" as const,
    data: await fs.readFile(path.join(fontDir, "geist-regular.ttf")),
  },
  {
    name: "Geist",
    weight: 600 as const,
    style: "normal" as const,
    data: await fs.readFile(path.join(fontDir, "geist-semibold.ttf")),
  },
  {
    name: "Geist Mono",
    weight: 400 as const,
    style: "normal" as const,
    data: await fs.readFile(path.join(fontDir, "geist-mono-regular.ttf")),
  },
];

// Satori takes React-shaped element objects; this is the whole "runtime"
type Node = {
  type: string;
  props: { style?: Record<string, unknown>; children?: unknown };
};
const el = (
  type: string,
  style: Record<string, unknown>,
  children?: unknown,
): Node => ({ type, props: { style, children } });

// The same ambient accent glow body::before paints on every page.
// Both stops are opaque (fading to the page white) because resvg
// renders transparent gradient stops as black.
const glowBackground =
  "radial-gradient(circle at 12% -10%, #e9f0fd 0%, #ffffff 55%)";

const dot = (size: number) =>
  el("div", {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "9999px",
    background: colors.accent,
  });

function postCard(title: string, date: Date): Node {
  const formatted = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return el(
    "div",
    {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "72px 80px",
      backgroundImage: glowBackground,
      position: "relative",
    },
    [
      el(
        "div",
        {
          display: "flex",
          fontFamily: "Geist Mono",
          fontSize: "28px",
          color: colors.tx3,
        },
        formatted,
      ),
      el(
        "div",
        {
          display: "flex",
          fontFamily: "Geist",
          fontWeight: 600,
          fontSize: title.length > 42 ? "64px" : "76px",
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          color: colors.tx1,
          maxWidth: "1000px",
        },
        title,
      ),
      el(
        "div",
        {
          display: "flex",
          alignItems: "center",
          gap: "20px",
        },
        [
          dot(36),
          el(
            "div",
            {
              display: "flex",
              fontFamily: "Geist",
              fontSize: "32px",
              color: colors.tx2,
            },
            "Sam McClenaghan",
          ),
          el(
            "div",
            {
              display: "flex",
              fontFamily: "Geist Mono",
              fontSize: "28px",
              color: colors.tx3,
              marginLeft: "auto",
            },
            "smccl.ca",
          ),
        ],
      ),
    ],
  );
}

function defaultCard(): Node {
  return el(
    "div",
    {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "80px",
      backgroundImage: glowBackground,
      position: "relative",
    },
    [
      el("div", { display: "flex", marginBottom: "40px" }, [dot(56)]),
      el(
        "div",
        {
          display: "flex",
          fontFamily: "Geist",
          fontWeight: 600,
          fontSize: "84px",
          letterSpacing: "-0.02em",
          color: colors.tx1,
        },
        "Sam McClenaghan",
      ),
      el(
        "div",
        {
          display: "flex",
          fontFamily: "Geist",
          fontSize: "36px",
          lineHeight: 1.4,
          color: colors.tx2,
          marginTop: "24px",
          maxWidth: "900px",
        },
        "Software engineer and CS student. Terminal tools, web apps, and writing about what building them taught me.",
      ),
      el(
        "div",
        {
          display: "flex",
          fontFamily: "Geist Mono",
          fontSize: "28px",
          color: colors.tx3,
          marginTop: "48px",
        },
        "smccl.ca",
      ),
    ],
  );
}

export async function getStaticPaths() {
  const posts = await getCollection("blog");
  return [
    { params: { slug: "default" }, props: { post: null } },
    ...posts.map((post) => ({ params: { slug: post.id }, props: { post } })),
  ];
}

export async function GET({ props }: APIContext) {
  const { post } = props as {
    post: { data: { title: string; date: Date } } | null;
  };

  const tree = post ? postCard(post.data.title, post.data.date) : defaultCard();

  const svg = await satori(tree as never, {
    width: WIDTH,
    height: HEIGHT,
    fonts,
  });

  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
  })
    .render()
    .asPng();

  return new Response(png, {
    headers: { "Content-Type": "image/png" },
  });
}
