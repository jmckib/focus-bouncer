const $ = (id) => document.getElementById(id);
let state = { ...DEFAULTS };

function renderSession() {
  const remaining = state.sessionEnd - Date.now();
  $("idle").hidden = remaining > 0;
  $("running").hidden = remaining <= 0;
  if (remaining > 0) $("countdown").textContent = formatRemaining(remaining);
}

function renderWhitelist() {
  const list = $("whitelist");
  list.replaceChildren();
  for (const domain of state.whitelist) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = domain;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = "×";
    remove.title = `Remove ${domain}`;
    remove.addEventListener("click", () => {
      browser.storage.local.set({ whitelist: state.whitelist.filter((d) => d !== domain) });
    });
    item.append(name, remove);
    list.append(item);
  }
  $("empty").hidden = state.whitelist.length > 0;
}

$("start-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const minutes = $("minutes").valueAsNumber;
  browser.storage.local.set({ lastMinutes: minutes, sessionEnd: Date.now() + minutes * 60000 });
});

$("end").addEventListener("click", () => {
  browser.storage.local.set({ sessionEnd: 0 });
});

$("domain").addEventListener("input", () => $("domain").setCustomValidity(""));

$("add-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("domain");
  const domain = normalizeDomain(input.value);
  if (!domain) {
    input.setCustomValidity("Enter a site like example.com");
    input.reportValidity();
    return;
  }
  if (!state.whitelist.includes(domain)) {
    browser.storage.local.set({ whitelist: [...state.whitelist, domain] });
  }
  input.value = "";
});

browser.storage.local.onChanged.addListener((changes) => {
  for (const [key, { newValue }] of Object.entries(changes)) state[key] = newValue;
  renderSession();
  if (changes.whitelist) renderWhitelist();
});

browser.storage.local.get(DEFAULTS).then((stored) => {
  state = stored;
  $("minutes").value = state.lastMinutes;
  renderSession();
  renderWhitelist();
  setInterval(renderSession, 1000);
});
