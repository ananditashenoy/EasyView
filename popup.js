const settingNames = ["bigText", "highContrast", "bigButtons"];

// 1. When the popup opens, show the saved settings (all ON by default)
chrome.storage.sync.get(
  { bigText: true, highContrast: true, bigButtons: true },
  (settings) => {
    settingNames.forEach((name) => {
      document.getElementById(name).checked = settings[name];
    });
  }
);

// 2. When a checkbox is clicked, save it and reload the page
settingNames.forEach((name) => {
  document.getElementById(name).addEventListener("change", (event) => {
    chrome.storage.sync.set({ [name]: event.target.checked }, () => {
      chrome.tabs.reload();
    });
  });
});