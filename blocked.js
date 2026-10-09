// Stands in for the site in ?url=..., which the user navigated to mid-session.
const target = siteUrl(new URLSearchParams(location.search).get("url") || "");
let state = { ...DEFAULTS };

async function closeSelf() {
  const tab = await browser.tabs.getCurrent();
  browser.tabs.remove(tab.id);
}

function refresh() {
  const remaining = state.sessionEnd - Date.now();
  if (target && (remaining <= 0 || !isBlocked(target, state.whitelist))) {
    location.replace(target);
  } else {
    document.getElementById("countdown").textContent = formatRemaining(remaining);
  }
}

document.getElementById("message").textContent =
  `${target ? new URL(target).hostname : "This site"} isn't on your allowed list`;

document.getElementById("back").addEventListener("click", () => {
  if (history.length > 1) history.back();
  else closeSelf();
});

browser.storage.local.onChanged.addListener((changes) => {
  for (const [key, { newValue }] of Object.entries(changes)) state[key] = newValue;
  refresh();
});

browser.storage.local.get(DEFAULTS).then((stored) => {
  state = stored;
  refresh();
  setInterval(refresh, 1000);
});
