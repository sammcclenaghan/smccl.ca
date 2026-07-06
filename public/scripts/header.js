function applySequentialFade(root = document) {
  const elements = root.querySelectorAll(".animate");
  elements.forEach((element, index) => {
    element.style.setProperty("--i", String(index + 1));
    element.style.animation = "none";
    void element.offsetWidth;
    element.style.animation = "";
  });
}

function prepareSequentialFade(doc) {
  const elements = doc.querySelectorAll(".animate");
  elements.forEach((element, index) => {
    element.style.setProperty("--i", String(index + 1));
  });
}

function isEditableElement(element) {
  const tagName = element?.tagName?.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    Boolean(element && "isContentEditable" in element && element.isContentEditable)
  );
}

function handleKeydown(event) {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (isEditableElement(document.activeElement)) {
    return;
  }

  const section = {
    h: "home",
    w: "writing",
    p: "projects",
  }[event.key.toLowerCase()];

  if (!section) {
    return;
  }

  const link = document.querySelector(`a[data-section="${section}"]`);
  if (!link) {
    return;
  }

  event.preventDefault();

  // Already there — nothing to do.
  if (link.getAttribute("aria-current") === "page") {
    return;
  }

  link.click();
}

// One-shot dot gestures. Clearing the others first means a new gesture
// always interrupts a stale one instead of silently losing the race.
const DOT_GESTURES = ["dot-release", "dot-shrug"];

function playDotGesture(dot, name) {
  DOT_GESTURES.forEach((gesture) => dot.classList.remove(gesture));
  void dot.offsetWidth;
  dot.classList.add(name);
  dot.addEventListener("animationend", function onEnd(event) {
    if (event.animationName !== name) return;
    dot.classList.remove(name);
    dot.removeEventListener("animationend", onEnd);
  });
}

// On the home page the dot has nowhere left to take you — clicking it
// (or pressing "h") earns a shrug instead of a pointless navigation.
function handleDotClick(event) {
  const dot =
    event.target instanceof Element ? event.target.closest("#nav-dot") : null;
  if (!dot) return;
  if (window.location.pathname !== "/") return;
  event.preventDefault();
  playDotGesture(dot, "dot-shrug");
}

// Press physics: the dot squashes while held and springs back on release.
// The pointer can leave the dot before letting go, so release listens
// document-wide and looks for whichever dot is still pressed.
function handleDotPress(event) {
  const dot =
    event.target instanceof Element ? event.target.closest("#nav-dot") : null;
  if (!dot) return;
  dot.classList.add("dot-pressed");
}

function handleDotRelease() {
  const dot = document.querySelector("#nav-dot.dot-pressed");
  if (!dot) return;
  dot.classList.remove("dot-pressed");
  playDotGesture(dot, "dot-release");
}

if (!window.__siteHeaderInitialized) {
  window.__siteHeaderInitialized = true;

  document.addEventListener("click", handleDotClick);
  document.addEventListener("pointerdown", handleDotPress);
  document.addEventListener("pointerup", handleDotRelease);
  document.addEventListener("pointercancel", handleDotRelease);

  document.addEventListener("DOMContentLoaded", () => {
    applySequentialFade();
  });
  document.addEventListener("astro:page-load", () => {
    applySequentialFade();
  });
  document.addEventListener("astro:after-swap", () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  document.addEventListener("astro:before-swap", (event) => {
    prepareSequentialFade(event.newDocument);
  });
  document.addEventListener("keydown", handleKeydown);
}

if (document.readyState !== "loading") {
  applySequentialFade();
}
