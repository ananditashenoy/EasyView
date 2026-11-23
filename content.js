console.log("EasyView is running on this page");

// ---------- Helper 1: find the real background color, or null if none found ----------
function getBackgroundColor(element) {
  let current = element;
  while (current) {
    const style = window.getComputedStyle(current);
    const bg = style.backgroundColor;
    if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
      return bg;
    }
    const image = style.backgroundImage;
    if (image.includes("gradient")) {
      const firstColor = image.match(/rgba?\([^)]+\)/);
      if (firstColor) return firstColor[0];
    }
    current = current.parentElement;
  }
  return null;
}

// ---------- Helper 2: brightness of a color (0 = black, 255 = white) ----------
function brightness(color) {
  const [r, g, b] = color.match(/\d+(\.\d+)?/g).map(Number);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

chrome.storage.sync.get(
  { textSize: 125, highContrast: true, bigButtons: true, hoverZoom: false },
  (settings) => {
    const textElements = document.querySelectorAll(
      "p, li, span, a, td, th, label, button, h1, h2, h3, h4, h5, h6"
    );

    // ---------- Read ORIGINAL sizes and colors first ----------
    const originalSizes = [];
    const originalColors = [];
    textElements.forEach((element) => {
      const style = window.getComputedStyle(element);
      originalSizes.push(parseFloat(style.fontSize));
      originalColors.push(style.color);
    });

    // ---------- 1. Text size (from the slider) ----------
    if (settings.textSize > 100) {
      const scale = settings.textSize / 100;
      textElements.forEach((element, i) => {
        element.style.setProperty("font-size", originalSizes[i] * scale + "px", "important");
      });
    }

    // ---------- 2. High contrast + spacing ----------
    if (settings.highContrast) {
      textElements.forEach((element, i) => {
        const background = getBackgroundColor(element);

        let darkBackground;
        if (background) {
          darkBackground = brightness(background) < 128;
        } else {
          darkBackground = brightness(originalColors[i]) > 180;
        }

        if (darkBackground) {
          element.style.setProperty("color", "#ffffff", "important");
        } else {
          element.style.setProperty("color", "#111111", "important");
          if (element.closest("a")) {
            element.style.setProperty("color", "#0645ad", "important");
          }
        }

        const link = element.closest("a");
        if (link) {
          const insideText = link.closest("p") || link.closest("article li");
          element.style.setProperty(
            "text-decoration",
            insideText ? "underline" : "none",
            "important"
          );
        }

        if (element.tagName === "P" || element.tagName === "LI") {
          element.style.setProperty("line-height", "1.6", "important");
        }
      });
    }

    // ---------- 3. Bigger buttons + clear focus outline ----------
    if (settings.bigButtons) {
      document.querySelectorAll("a, button, input, select").forEach((element) => {
        if (element.tagName === "A") {
          element.style.setProperty("padding", "4px 2px", "important");
        } else {
          element.style.setProperty("min-height", "44px", "important");
          element.style.setProperty("min-width", "44px", "important");
          element.style.setProperty("padding", "10px 18px", "important");
        }
      });

      const focusStyle = document.createElement("style");
      focusStyle.textContent = `
        a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible {
          outline: 3px solid #ff9800 !important;
          outline-offset: 3px !important;
        }
      `;
      document.head.appendChild(focusStyle);
    }

    // ---------- 4. Magnify text on hover ----------
    if (settings.hoverZoom) {
      const zoomBox = document.createElement("div");
      zoomBox.style.cssText = `
        position: fixed; display: none; z-index: 2147483647;
        max-width: 480px; padding: 12px 16px;
        background: #111111; color: #ffeb3b;
        font-size: 28px; line-height: 1.4; font-family: Arial, sans-serif;
        border-radius: 10px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        pointer-events: none;
      `;
      document.body.appendChild(zoomBox);

      let hoverTimer;

      document.addEventListener("mouseover", (event) => {
        clearTimeout(hoverTimer);
        const target = event.target.closest(
          "p, li, a, span, td, th, label, button, h1, h2, h3, h4, h5, h6"
        );
        const text = target ? target.innerText.trim() : "";

        if (text.length === 0) {
          zoomBox.style.display = "none";
          return;
        }

        hoverTimer = setTimeout(() => {
          zoomBox.textContent = text.length > 300 ? text.slice(0, 300) + "…" : text;
          zoomBox.style.display = "block";
        }, 400);
      });

      document.addEventListener("mousemove", (event) => {
        let x = event.clientX + 20;
        let y = event.clientY + 20;
        if (x + zoomBox.offsetWidth > window.innerWidth) {
          x = event.clientX - zoomBox.offsetWidth - 20;
        }
        if (y + zoomBox.offsetHeight > window.innerHeight) {
          y = event.clientY - zoomBox.offsetHeight - 20;
        }
        zoomBox.style.left = Math.max(10, x) + "px";
        zoomBox.style.top = Math.max(10, y) + "px";
      });

      document.addEventListener("mouseout", (event) => {
        if (!event.relatedTarget) zoomBox.style.display = "none";
      });
    }
  }
);