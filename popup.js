const checkboxNames = ["highContrast", "bigButtons", "hoverZoom", "readAloud", "hoverSpeak"];
const slider = document.getElementById("textSize");
const sliderValue = document.getElementById("textSizeValue");

chrome.storage.sync.get(
  { textSize: 125, highContrast: true, bigButtons: true, hoverZoom: false, readAloud: true, hoverSpeak: false },
  (settings) => {
    slider.value = settings.textSize;
    sliderValue.textContent = settings.textSize + "%";
    checkboxNames.forEach((name) => {
      document.getElementById(name).checked = settings[name];
    });
  }
);

slider.addEventListener("input", () => {
  sliderValue.textContent = slider.value + "%";
});

slider.addEventListener("change", () => {
  chrome.storage.sync.set({ textSize: Number(slider.value) }, () => {
    chrome.tabs.reload();
  });
});

checkboxNames.forEach((name) => {
  document.getElementById(name).addEventListener("change", (event) => {
    chrome.storage.sync.set({ [name]: event.target.checked }, () => {
      chrome.tabs.reload();
    });
  });
});