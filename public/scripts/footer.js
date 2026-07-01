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

// Theme changes sweep out from the toggle as an expanding circle.
// global.css neutralizes the default view-transition crossfade while
// html[data-theme-switching] is set; we drive the clip-path here.
function setTheme(mode, origin) {
  localStorage.setItem(STORAGE_KEY, mode);
  updateToggleLabel(mode);

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (!document.startViewTransition || reduceMotion || !origin) {
    applyTheme(mode);
    return;
  }

  const rect = origin.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  docEl.dataset.themeSwitching = "";
  const transition = document.startViewTransition(() => applyTheme(mode));
  transition.ready
    .then(() => {
      docEl.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 400,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});
  transition.finished.finally(() => {
    delete docEl.dataset.themeSwitching;
  });
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
    setTheme(getTheme() === "dark" ? "light" : "dark", toggle);
  });
}

initializeFooterState();
