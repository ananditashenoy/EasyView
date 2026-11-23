const checkboxNames = ["highContrast", "bigButtons"];
const slider = document.getElementById("textSize");
const sliderValue = document.getElementById("textSizeValue");

// Load saved settings into the popup
chrome.storage.sync.get(
  { textSize: 125, highContrast: true, bigButtons: true },
  (settings) => {
    slider.value = settings.textSize;
    sliderValue.textContent = settings.textSize + "%";
    checkboxNames.forEach((name) => {
      document.getElementById(name).checked = settings[name];
    });
  }
);

// While dragging: update the number shown
slider.addEventListener("input", () => {
  sliderValue.textContent = slider.value + "%";
});

// When you let go: save it and reload the page
slider.addEventListener("change", () => {
  chrome.storage.sync.set({ textSize: Number(slider.value) }, () => {
    chrome.tabs.reload();
  });
});

// Checkboxes: same as before
checkboxNames.forEach((name) => {
  document.getElementById(name).addEventListener("change", (event) => {
    chrome.storage.sync.set({ [name]: event.target.checked }, () => {
      chrome.tabs.reload();
    });
  });
});