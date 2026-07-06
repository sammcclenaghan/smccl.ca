const STORAGE_KEY = "theme";
const docEl = document.documentElement;
const media = window.matchMedia("(prefers-color-scheme: dark)");

function getStoredTheme() {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

// Follow the system preference until the user makes an explicit choice.
function getTheme() {
  return getStoredTheme() ?? (media.matches ? "dark" : "light");
}

// Matches --bg1 in global.css; keeps mobile browser chrome in sync
const THEME_COLORS = { light: "#fff", dark: "#121212" };

function applyTheme(mode) {
  docEl.classList.toggle("dark", mode === "dark");
  docEl.dataset.theme = mode;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[mode]);
}

function updateToggleLabel(mode) {
  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    const next = mode === "dark" ? "light" : "dark";
    toggle.setAttribute("aria-label", `Switch to ${next} theme`);
  }
}

function setTheme(mode) {
  localStorage.setItem(STORAGE_KEY, mode);
  updateToggleLabel(mode);
  applyTheme(mode);
}

function initializeFooterState() {
  const mode = getTheme();
  applyTheme(mode);
  updateToggleLabel(mode);
}

if (!window.__siteFooterInitialized) {
  window.__siteFooterInitialized = true;

  media.addEventListener("change", () => {
    if (!getStoredTheme()) {
      applyTheme(getTheme());
    }
  });

  document.addEventListener("astro:before-swap", (event) => {
    const mode = getTheme();
    const html = event.newDocument.documentElement;
    html.classList.toggle("dark", mode === "dark");
    html.dataset.theme = mode;
    event.newDocument
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[mode]);
  });

  document.addEventListener("astro:page-load", initializeFooterState);

  document.addEventListener("click", (event) => {
    const toggle = event.target?.closest?.("#theme-toggle");
    if (!toggle) return;
    setTheme(getTheme() === "dark" ? "light" : "dark");
  });
}

initializeFooterState();
