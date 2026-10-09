# Focus Bouncer

A Firefox extension that blocks every site except your allowed list for a set amount of time.

- Switch to a tab that isn't allowed and you're sent back to the tab you were on. The blocked tab is left untouched.
- Navigate to a site that isn't allowed and you get a block page with the time remaining.
- The allowed list is saved permanently and can be edited mid-session.
- You can end a session at any time.

## Testing

Requires Firefox 140 or later.

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select `manifest.json` from this folder.
3. Click the Focus Bouncer toolbar button, add a site to the allowed list, and start a session.

After changing the code, click **Reload** next to the extension on the same page. A temporary add-on is removed when Firefox restarts.

To check the manifest and code against Mozilla's rules:

```bash
npx web-ext lint
```

## Building

To build the zip for upload to addons.mozilla.org (written to `web-ext-artifacts/`):

```bash
npx web-ext build --overwrite-dest
```
