console.log("EasyView is running on this page");

// ---------- Helper 1: find the real background color, or null if none found ----------
function getBackgroundColor(element) {
  let current = element;
  while (current) {
    const style = window.getComputedStyle(current);
    const bg = style.backgroundColor;
    if (bg !== "transparent") {
      const parts = bg.match(/[\d.]+/g).map(Number);
      const alpha = parts.length === 4 ? parts[3] : 1; // rgba has a 4th number: opacity
      if (alpha >= 0.5) return bg; // only trust backgrounds that are mostly solid
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
  { textSize: 125, highContrast: true, bigButtons: true, hoverZoom: false, readAloud: true, hoverSpeak: false },
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
          element.style.setProperty("line-height", "1.3", "important"); // spacing grows with the text
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
      console.log("EasyView: read aloud is ON");
      const speakButton = document.createElement("button");
      speakButton.dataset.easyviewUi = "true";
      speakButton.textContent = "🔊 Read aloud";
      speakButton.style.cssText = `
        position: fixed; display: none; z-index: 2147483647;
        padding: 10px 16px; font-size: 18px; font-family: Arial, sans-serif;
        background: #1b5e20; color: #ffffff; border: none; border-radius: 8px;
        cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      `;
      document.documentElement.appendChild(speakButton);

      let selectedText = "";

      document.addEventListener("mouseup", (event) => {
        if (event.target === speakButton) return;
        setTimeout(() => {
          selectedText = window.getSelection().toString().trim();
          console.log("EasyView selected:", selectedText.slice(0, 50));
          if (selectedText.length > 0) {
            speakButton.style.left = Math.min(event.clientX + 10, window.innerWidth - 180) + "px";
            speakButton.style.top = Math.min(event.clientY + 10, window.innerHeight - 60) + "px";
            speakButton.style.display = "block";
          } else {
            speakButton.style.display = "none";
          }
        }, 10);
      }, true); // capture phase: hear the event before the site can block it

      // Hide the button when scrolling, since it's fixed to the screen
      window.addEventListener("scroll", () => {
        if (!speechSynthesis.speaking) speakButton.style.display = "none";
      }, true);

      speakButton.addEventListener("mousedown", (event) => event.preventDefault());

      speakButton.addEventListener("click", () => {
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
          speakButton.textContent = "🔊 Read aloud";
          return;
        }
        speechSynthesis.cancel(); // clear anything stuck in Chrome's speech queue
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
    } else {
      console.log("EasyView: read aloud is OFF in settings");
    }

    // ---------- 6. Read aloud on hover ----------
    if (settings.hoverSpeak) {
      let speakTimer;
      let lastSpoken = "";

      document.addEventListener("mouseover", (event) => {
        clearTimeout(speakTimer);
        if (event.target.closest("[data-easyview-ui]")) return; // ignore EasyView's own UI

        // Buttons and links first; otherwise the nearest element that holds text
        let target = event.target.closest("a, button, [role='button'], input, select, label");
        if (!target) {
          target = event.target;
          while (target && target !== document.body && !hasOwnText(target)) {
            target = target.parentElement;
          }
        }
        if (!target || target === document.body) return;

        // What to say: a button's label, an input's value or placeholder, or the visible text
        let text =
          target.getAttribute("aria-label") ||
          (target.tagName === "INPUT" ? target.value || target.placeholder : "") ||
          target.innerText ||
          "";
        text = text.trim().replace(/\s+/g, " ");
        if (text.length === 0) return;
        if (text.length > 200) text = text.slice(0, 200) + "...";

        // Wait until the mouse rests for a moment, then speak
        speakTimer = setTimeout(() => {
          if (text === lastSpoken && speechSynthesis.speaking) return; // don't repeat mid-sentence
          speechSynthesis.cancel(); // stop the previous item
          const speech = new SpeechSynthesisUtterance(text);
          speech.rate = 0.9;
          speechSynthesis.speak(speech);
          lastSpoken = text;
        }, 700);
      }, true);

      // Moving the mouse off the page stops the waiting timer
      document.addEventListener("mouseout", (event) => {
        if (!event.relatedTarget) clearTimeout(speakTimer);
      });

      // Escape stops speaking
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") speechSynthesis.cancel();
      });
    }
  }
);