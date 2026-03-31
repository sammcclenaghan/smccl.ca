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
    b: "blog",
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
  link.classList.add("keycap-visible");
  window.setTimeout(() => link.classList.remove("keycap-visible"), 600);
  link.click();
}

if (!window.__siteHeaderInitialized) {
  window.__siteHeaderInitialized = true;

  document.addEventListener("DOMContentLoaded", () => applySequentialFade());
  document.addEventListener("astro:page-load", () => applySequentialFade());
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
