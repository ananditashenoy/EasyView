# EasyView

**A Chrome extension that makes websites easier to read and use for older adults.**

Many older adults struggle with small text, low-contrast colors, and tiny buttons on everyday websites. Some sites have their own accessibility widgets, but every site's widget works differently, and most sites have none. EasyView works the same way on every website, automatically.

## Features

- **Adjustable text size:** a slider from 100% to 200%
- **High contrast:** detects whether text sits on a light or dark background and adjusts it automatically:
  - dark text on light backgrounds
  - white text on dark backgrounds
  - links in a clear blue, underlined only inside paragraphs (menus stay clean)
- **Comfortable spacing:** extra line height for paragraphs
- **Bigger buttons:** buttons and inputs are at least 44×44 px (the WCAG recommended touch target size)
- **Clear keyboard focus:** a thick orange outline shows where you are when using the keyboard
- **Hover magnifier (opt-in):** pause the mouse over any text to see it in a large yellow-on-black box
- **Simple settings popup:** one slider and a few checkboxes; a green ON / gray OFF badge on the icon shows status at a glance

## How it works

| File | What it does |
|---|---|
| `manifest.json` | Tells Chrome what the extension is and what it's allowed to do |
| `content.js` | Runs on every web page and applies the changes |
| `popup.html` / `popup.js` | The settings menu; saves choices with `chrome.storage.sync` |
| `background.js` | Updates the ON/OFF badge on the toolbar icon |

**Contrast detection:** for each piece of text, EasyView walks up the page to find the real background color and calculates its perceived brightness (`0.299R + 0.587G + 0.114B`). If no background color can be found, it uses the site's original text color as a clue: light text usually means the designer put it on something dark.

**Design decisions:**
- Essential features (text size, contrast, buttons) are **on by default**; extra helpers like the hover magnifier are **opt-in**, so they don't surprise users
- The magnifier waits 400 ms before appearing, so it doesn't flash while the mouse is just passing over text
- The text size slider snaps to 5 clear steps (100, 125, 150, 175, 200%) instead of confusing in-between values

## Install (developer mode)

1. Download or clone this repository
2. Open `chrome://extensions` in Chrome
3. Turn on **Developer mode** (top right)
4. Click **Load unpacked** and select the EasyView folder
5. Click the puzzle piece icon and pin **EasyView**

## Tested on

| Site | Result |
|---|---|
| Wikipedia | ✅ Works |
| Insurance Asia News (dark menu bar) | ✅ Works after the light/dark background fix |
| Economic Times | ✅ Works after the underline and contrast fixes |
| Champaign Public Library | ✅ Hover magnifier works |
| The Economist | 🔄 Testing |
| OKA (purple buttons) | 🔄 Testing |

## Known issues

- Text on top of photos isn't detected, because photos aren't background colors
- Small icons can overlap bigger text on some sites (for example, Wikipedia's Contents arrows)
- The hover magnifier box can cover the lines just below the cursor
- Cluttered news sites are still busy; a Simple Reading Mode is planned

## Roadmap

- [x] Text size slider (100–200%)
- [x] ON/OFF status badge
- [x] Hover magnifier
- [ ] Read aloud with built-in speech synthesis
- [ ] Simple Reading Mode (hide ads and menus)
- [ ] Pause animations and autoplay
- [ ] Turn off on specific sites
- [ ] User testing with older adults
- [ ] Publish to the Chrome Web Store

## About

Built by **Anandita Shenoy**, CS at the University of Illinois Urbana-Champaign, as a human-computer interaction project focused on accessibility for older adults.