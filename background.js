const BLOCK_PAGE = browser.runtime.getURL("blocked.html");
const BADGE_COLOR = "#5b5bd6";
const FLASH_COLOR = "#d70022";

// All state lives in storage, so this script can be suspended and woken freely.
function getState() {
  return browser.storage.local.get(DEFAULTS);
}

// Enforcement runs one at a time so overlapping events can't double-act.
let queue = Promise.resolve();
function enqueue(fn) {
  queue = queue.then(fn).catch(console.error);
}

// If the window's active tab is showing a blocked site, get the user off it.
// A tab the user merely switched to is left untouched and we switch away;
// a tab that just navigated to a blocked site is sent to the block page.
async function enforce(windowId, navigatedTabId) {
  const state = await getState();
  if (state.sessionEnd <= Date.now()) return;
  const [tab] = await browser.tabs.query({ windowId, active: true, windowType: "normal" });
  if (!tab || !isBlocked(tab.url, state.whitelist)) return;

  if (tab.id === navigatedTabId) {
    await browser.tabs.update(tab.id, {
      url: BLOCK_PAGE + "?url=" + encodeURIComponent(siteUrl(tab.url)),
      loadReplace: true,
    });
  } else {
    await bounce(tab, state.whitelist);
  }
}

async function bounce(blockedTab, whitelist) {
  const tabs = await browser.tabs.query({ windowId: blockedTab.windowId, hidden: false });
  const allowed = tabs.filter((t) => t.id !== blockedTab.id && !isBlocked(t.url, whitelist));
  if (allowed.length) {
    const previous = allowed.reduce((a, b) => (b.lastAccessed > a.lastAccessed ? b : a));
    await browser.tabs.update(previous.id, { active: true });
  } else {
    await browser.tabs.create({ windowId: blockedTab.windowId, url: BLOCK_PAGE });
  }
  flashBadge();
}

async function enforceAll() {
  const windows = await browser.windows.getAll({ windowTypes: ["normal"] });
  for (const w of windows) enqueue(() => enforce(w.id));
}

async function updateBadge() {
  const { sessionEnd } = await getState();
  const minutes = Math.ceil((sessionEnd - Date.now()) / 60000);
  let text = "";
  if (minutes > 0) text = minutes < 100 ? String(minutes) : Math.floor(minutes / 60) + "h";
  browser.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  browser.action.setBadgeTextColor({ color: "#fff" });
  browser.action.setBadgeText({ text });
}

let flashTimer;
function flashBadge() {
  browser.action.setBadgeBackgroundColor({ color: FLASH_COLOR });
  browser.action.setBadgeText({ text: "✕" });
  clearTimeout(flashTimer);
  flashTimer = setTimeout(updateBadge, 1200);
}

// Bring alarms, badge and tabs in line with whatever is in storage.
async function sync() {
  const state = await getState();
  const remaining = state.sessionEnd - Date.now();
  if (remaining > 0) {
    browser.alarms.create("end", { when: state.sessionEnd });
    browser.alarms.create("tick", { when: Date.now() + (remaining % 60000) + 500, periodInMinutes: 1 });
    enforceAll();
  } else {
    browser.alarms.clearAll();
    // Clearing an expired session notifies any open block pages.
    if (state.sessionEnd) await browser.storage.local.set({ sessionEnd: 0 });
  }
  updateBadge();
}

let lastActivated = { tabId: null, time: 0 };

browser.tabs.onActivated.addListener(({ tabId, windowId }) => {
  lastActivated = { tabId, time: Date.now() };
  enqueue(() => enforce(windowId));
});

browser.tabs.onUpdated.addListener(
  (tabId, changeInfo, tab) => {
    if (!tab.active) return;
    // A URL change right after switching to a tab is that tab (re)loading,
    // not the user navigating, so treat it as a switch.
    const justActivated = lastActivated.tabId === tabId && Date.now() - lastActivated.time < 1000;
    enqueue(() => enforce(tab.windowId, justActivated ? undefined : tabId));
  },
  { properties: ["url"] }
);

browser.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== browser.windows.WINDOW_ID_NONE) enqueue(() => enforce(windowId));
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "end") sync();
  else updateBadge();
});

browser.storage.local.onChanged.addListener((changes) => {
  if (changes.sessionEnd || changes.whitelist) sync();
});

browser.runtime.onStartup.addListener(sync);
browser.runtime.onInstalled.addListener(sync);
