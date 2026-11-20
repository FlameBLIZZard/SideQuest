# Contributing to Sidequest

Thanks for wanting to help. Sidequest is meant to stay small, fun and dependency-free, so a few ground rules keep it that way.

## Ground rules

- **No build step.** Every app must work by double-clicking its `index.html` (that means `file://`). No bundlers, no frameworks, no CDN scripts.
- **No network.** Apps never upload, fetch or track anything. If a feature needs a server, it doesn't belong here.
- **One folder per app.** An app lives in `apps/<slug>/index.html` and may use `shared/sq.css` and `shared/sq.js`.
- **Keep it readable.** Plain modern JavaScript, small functions, a comment where something is clever.

## Running locally

Open `index.html` in Chrome, Edge, Firefox or Safari. Edit a file, refresh the page.

## Tests

`npm test` opens the launcher and every app in headless Chromium and fails if any page throws an error. It needs Playwright:

```bash
npm install
npx playwright install chromium
npm test
```

Buttons marked with a `data-smoke` attribute are also clicked during the test, so mark safe buttons (ones that don't download files or open dialogs) to get more coverage.

## Pull requests

1. Fork and create a branch (`feat/my-toy`, `fix/pixie-fill`).
2. Make your change and run `npm test`.
3. Add a line to `CHANGELOG.md` under "Unreleased".
4. Open a pull request describing what changed and how you tested it. Screenshots help a lot.

## Adding a new app

See [docs/adding-an-app.md](docs/adding-an-app.md).
