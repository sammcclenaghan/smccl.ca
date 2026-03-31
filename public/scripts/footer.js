const STORAGE_KEY = "theme";
const DEFAULT_THEME = "system";
const docEl = document.documentElement;
const media = window.matchMedia("(prefers-color-scheme: dark)");

function getStoredTheme() {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" || value === "system"
    ? value
    : DEFAULT_THEME;
}

function getTheme() {
  const mode = getStoredTheme();
  if (localStorage.getItem(STORAGE_KEY) !== mode) {
    localStorage.setItem(STORAGE_KEY, mode);
  }
  return mode;
}

function computeIsDark(mode) {
  return mode === "dark" || (mode === "system" && media.matches);
}

function applyTheme(mode) {
  docEl.classList.toggle("dark", computeIsDark(mode));
  docEl.dataset.theme = mode;
}

function updateButtonsActive(mode) {
  const buttons = document.querySelectorAll("button[data-theme]");
  buttons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.theme === mode));
  });
}

function setTheme(mode) {
  localStorage.setItem(STORAGE_KEY, mode);
  if (document.startViewTransition) {
    document.startViewTransition(() => applyTheme(mode));
  } else {
    applyTheme(mode);
  }
  updateButtonsActive(mode);
}

function initializeFooterState() {
  const mode = getTheme();
  applyTheme(mode);
  updateButtonsActive(mode);
}

if (!window.__siteFooterInitialized) {
  window.__siteFooterInitialized = true;

  media.addEventListener("change", () => {
    if (getTheme() === "system") {
      applyTheme("system");
    }
  });

  document.addEventListener("astro:before-swap", (event) => {
    const mode = getTheme();
    const html = event.newDocument.documentElement;
    html.classList.toggle("dark", computeIsDark(mode));
    html.dataset.theme = mode;
  });

  document.addEventListener("astro:page-load", initializeFooterState);

  document.addEventListener("click", async (event) => {
    const target = event.target;
    const themeButton = target?.closest?.("button[data-theme]");
    if (themeButton?.dataset.theme) {
      setTheme(themeButton.dataset.theme);
    }
  });
}

initializeFooterState();
