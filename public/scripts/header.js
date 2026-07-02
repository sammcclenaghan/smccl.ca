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

function getNavDot() {
  return document.getElementById("nav-dot");
}

// On article pages, the dot pales out and saturates back to full accent
// as you read; reaching the end earns one completion pulse.
let ringCleanup = null;

function setupReadingRing() {
  if (ringCleanup) {
    ringCleanup();
    ringCleanup = null;
  }

  const dot = getNavDot();
  const article = document.querySelector("article");
  if (!dot) {
    return;
  }
  if (!article) {
    dot.classList.remove("dot-reading");
    return;
  }

  // The pulse fires once when the reader reaches the end, and re-arms
  // only after they scroll back up a real distance — no re-triggering
  // from small wiggles at the bottom of the page.
  let completed = false;

  function celebrate() {
    dot.classList.add("dot-complete");
    dot.addEventListener("animationend", function onEnd(event) {
      if (event.animationName !== "dot-complete") return;
      dot.classList.remove("dot-complete");
      dot.removeEventListener("animationend", onEnd);
    });
  }

  function update() {
    const rect = article.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    // A post that fits on one screen has nothing to track.
    if (total < 80) {
      dot.classList.remove("dot-reading");
      return;
    }
    dot.classList.add("dot-reading");
    const progress = Math.min(1, Math.max(0, -rect.top / total));
    dot.style.setProperty("--progress", String(progress));

    if (progress >= 0.995) {
      if (!completed) {
        completed = true;
        celebrate();
      }
    } else if (progress < 0.9) {
      completed = false;
    }
  }

  let frame = 0;
  function onScroll() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();

  ringCleanup = () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    if (frame) cancelAnimationFrame(frame);
  };
}

// The dot doubles as the loading indicator: it only starts breathing if a
// navigation is still in flight after 300ms, and greets each page landing
// with a single pulse.
let loadingTimer = null;

function handleNavigationStart() {
  loadingTimer = setTimeout(() => {
    getNavDot()?.classList.add("dot-loading");
  }, 300);
}

function handlePageLanded() {
  if (loadingTimer) {
    clearTimeout(loadingTimer);
    loadingTimer = null;
  }
  const dot = getNavDot();
  if (!dot) return;
  dot.classList.remove("dot-loading");
  dot.classList.add("dot-arrive");
  dot.addEventListener(
    "animationend",
    () => dot.classList.remove("dot-arrive"),
    { once: true },
  );
}

// On the home page the dot has nowhere left to take you — clicking it
// shouldn't trigger a pointless same-page navigation.
function handleDotClick(event) {
  const dot =
    event.target instanceof Element ? event.target.closest("#nav-dot") : null;
  if (!dot) return;
  if (window.location.pathname !== "/") return;
  event.preventDefault();
}

if (!window.__siteHeaderInitialized) {
  window.__siteHeaderInitialized = true;

  document.addEventListener("click", handleDotClick);

  document.addEventListener("DOMContentLoaded", () => {
    applySequentialFade();
    setupReadingRing();
  });
  document.addEventListener("astro:page-load", () => {
    applySequentialFade();
    setupReadingRing();
    handlePageLanded();
  });
  document.addEventListener("astro:before-preparation", handleNavigationStart);
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
  setupReadingRing();
}
