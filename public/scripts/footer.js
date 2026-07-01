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

function applyTheme(mode) {
  docEl.classList.toggle("dark", mode === "dark");
  docEl.dataset.theme = mode;
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
  if (document.startViewTransition) {
    document.startViewTransition(() => applyTheme(mode));
  } else {
    applyTheme(mode);
  }
  updateToggleLabel(mode);
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
  });

  document.addEventListener("astro:page-load", initializeFooterState);

  document.addEventListener("click", (event) => {
    const toggle = event.target?.closest?.("#theme-toggle");
    if (!toggle) return;
    setTheme(getTheme() === "dark" ? "light" : "dark");
  });
}

initializeFooterState();
