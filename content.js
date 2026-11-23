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

// ---------- Helper 3: does this element directly contain text? ----------
function hasOwnText(element) {
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
      return true;
    }
  }
  return false;
}

chrome.storage.sync.get(
  { textSize: 125, highContrast: true, bigButtons: true, hoverZoom: false, readAloud: true },
  (settings) => {

    // Find every element inside "root" that holds text and hasn't been processed yet
    function findTextElements(root) {
      const all = [root, ...root.querySelectorAll("*")];
      return all.filter((element) =>
        !element.dataset.easyview &&
        hasOwnText(element) &&
        !element.closest("script, style, noscript, svg, [data-easyview-ui]")
      );
    }

    // ---------- 1 + 2. Text size and high contrast ----------
    function processTextElements(elements) {
      // Read ALL original sizes and colors first, before changing anything
      const originals = elements.map((element) => {
        const style = window.getComputedStyle(element);
        return { size: parseFloat(style.fontSize), color: style.color };
      });

      elements.forEach((element, i) => {
        element.dataset.easyview = "done"; // mark it so we never process it twice

        // Text size
        if (settings.textSize > 100) {
          const scale = settings.textSize / 100;
          element.style.setProperty("font-size", originals[i].size * scale + "px", "important");
        }

        // High contrast
        if (settings.highContrast) {
          const background = getBackgroundColor(element);
          let darkBackground;
          if (background) {
            darkBackground = brightness(background) < 128;
          } else {
            darkBackground = brightness(originals[i].color) > 180;
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
            element.style.setProperty("text-decoration", insideText ? "underline" : "none", "important");
          }

          if (element.tagName === "P" || element.tagName === "LI") {
            element.style.setProperty("line-height", "1.6", "important");
          }
        }
      });
    }

    // ---------- 3. Bigger buttons ----------
    function processClickables(root) {
      if (!settings.bigButtons) return;
      const all = [root, ...root.querySelectorAll("a, button, input, select")];
      all.forEach((element) => {
        if (!element.matches("a, button, input, select")) return;
        if (element.closest("[data-easyview-ui]")) return; // skip EasyView's own buttons
        if (element.tagName === "A") {
          element.style.setProperty("padding", "4px 2px", "important");
        } else {
          element.style.setProperty("min-height", "44px", "important");
          element.style.setProperty("min-width", "44px", "important");
          element.style.setProperty("padding", "10px 18px", "important");
        }
      });
    }

    // Run on everything that's on the page right now
    processTextElements(findTextElements(document.body));
    processClickables(document.body);

    // Keep watching: fix any new content the site adds later
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return; // only real elements
          processTextElements(findTextElements(node));
          processClickables(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Clear keyboard focus outline
    if (settings.bigButtons) {
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
      zoomBox.dataset.easyviewUi = "true"; // tells EasyView not to restyle its own box
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
        // Climb up from the mouse to the nearest element that holds text
        let target = event.target;
        while (target && target !== document.body && !hasOwnText(target)) {
          target = target.parentElement;
        }
        const text =
          target && target !== document.body && !target.closest("[data-easyview-ui]")
            ? target.innerText.trim()
            : "";

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

    // ---------- 5. Read aloud ----------
    if (settings.readAloud) {
      const speakButton = document.createElement("button");
      speakButton.dataset.easyviewUi = "true";
      speakButton.textContent = "🔊 Read aloud";
      speakButton.style.cssText = `
        position: absolute; display: none; z-index: 2147483647;
        padding: 10px 16px; font-size: 18px; font-family: Arial, sans-serif;
        background: #1b5e20; color: #ffffff; border: none; border-radius: 8px;
        cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      `;
      document.body.appendChild(speakButton);

      let selectedText = "";

      document.addEventListener("mouseup", (event) => {
        if (event.target === speakButton) return;
        setTimeout(() => {
          selectedText = window.getSelection().toString().trim();
          if (selectedText.length > 0) {
            speakButton.style.left = event.pageX + 10 + "px";
            speakButton.style.top = event.pageY + 10 + "px";
            speakButton.style.display = "block";
          } else {
            speakButton.style.display = "none";
          }
        }, 10);
      });

      speakButton.addEventListener("mousedown", (event) => event.preventDefault());

      speakButton.addEventListener("click", () => {
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
          speakButton.textContent = "🔊 Read aloud";
          return;
        }
                speechSynthesis.cancel();
        const speech = new SpeechSynthesisUtterance(selectedText);
        speech.rate = 0.9;
        speech.onend = () => {
          speakButton.textContent = "🔊 Read aloud";
          speakButton.style.display = "none";
        };
        speechSynthesis.speak(speech);
        speakButton.textContent = "⏹ Stop";
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") speechSynthesis.cancel();
      });
    }
  }
);