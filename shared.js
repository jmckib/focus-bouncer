// Loaded by the background script, the popup and the block page.

const DEFAULTS = { whitelist: [], sessionEnd: 0, lastMinutes: 25 };

// "https://www.Reddit.com/r/foo" -> "reddit.com". Returns null if unusable.
function normalizeDomain(input) {
  let s = input.trim().toLowerCase().replace(/^\*\./, "");
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(s)) s = "http://" + s;
  try {
    const host = new URL(s).hostname.replace(/^www\./, "").replace(/\.$/, "");
    return host || null;
  } catch {
    return null;
  }
}

// The http(s) URL a tab is really showing, or null for internal pages
// (about:, moz-extension:, file: ...), which are never blocked.
function siteUrl(url) {
  let u;
  try {
    u = new URL(url);
    if (u.protocol === "about:" && u.pathname === "reader") {
      u = new URL(u.searchParams.get("url"));
    }
  } catch {
    return null;
  }
  return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
}

function isBlocked(url, whitelist) {
  const site = siteUrl(url);
  if (!site) return false;
  const host = new URL(site).hostname.replace(/\.$/, "");
  return !whitelist.some((d) => host === d || host.endsWith("." + d));
}

function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
