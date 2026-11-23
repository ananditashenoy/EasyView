function updateBadge() {
  chrome.storage.sync.get(
    { textSize: 125, highContrast: true, bigButtons: true, hoverZoom: false, readAloud: true, hoverSpeak: false },
    (settings) => {
      const anyOn =
        settings.textSize > 100 ||
        settings.highContrast ||
        settings.bigButtons ||
        settings.hoverZoom ||
        settings.readAloud ||
        settings.hoverSpeak;

      chrome.action.setBadgeText({ text: anyOn ? "ON" : "OFF" });
      chrome.action.setBadgeBackgroundColor({ color: anyOn ? "#1b7f3b" : "#777777" });
    }
  );
}

chrome.runtime.onInstalled.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
chrome.storage.onChanged.addListener(updateBadge);