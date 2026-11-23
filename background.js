// Turns the badge on the toolbar icon green "ON" or gray "OFF"
function updateBadge() {
  chrome.storage.sync.get(
    { bigText: true, highContrast: true, bigButtons: true },
    (settings) => {
      const anyOn = settings.bigText || settings.highContrast || settings.bigButtons;

      chrome.action.setBadgeText({ text: anyOn ? "ON" : "OFF" });
      chrome.action.setBadgeBackgroundColor({ color: anyOn ? "#1b7f3b" : "#777777" });
    }
  );
}

// Run it at three moments:
chrome.runtime.onInstalled.addListener(updateBadge); // when the extension is installed or reloaded
chrome.runtime.onStartup.addListener(updateBadge);   // when Chrome opens
chrome.storage.onChanged.addListener(updateBadge);   // whenever a checkbox changes