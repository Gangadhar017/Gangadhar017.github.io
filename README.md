# gangadharsingh.me

Source of my portfolio, served by GitHub Pages at [gangadharsingh.me](https://gangadharsingh.me/).

Plain HTML, CSS and JavaScript. There is no framework and no build step: what is in this
repository is what the browser gets.

## Layout

| Path | What it holds |
| --- | --- |
| `index.html` | The whole page: hero, selected work, live deployments, practice, experience, credentials, index, contact |
| `assets/css/site.css` | All styles. Both themes share every rule and differ only in the colour tokens at the top |
| `assets/js/site.js` | Live checks, repository index, command palette, theme switch, motion |
| `assets/img/` | Screenshots (WebP), portrait, favicon, share image |
| `404.html` | Not-found page |
| `CNAME` | Custom domain for GitHub Pages |

## Editing

- **Projects** are written directly in `index.html`. Each featured project is one `<article>`.
- **The repository index** is the `REPOS` array in `assets/js/site.js`:
  `[name, kind, year, language, description, 'live' or nothing]`.
- **Live checks** read the `FLEET` object in `assets/js/site.js`. Hosts marked `auto` are
  checked when the page opens. Render services are left alone until a visitor presses
  *Wake*, because the free tier has a monthly hour budget.
- **LeetCode numbers** are a snapshot in `index.html`. Codeforces refreshes itself from
  the public API.

## Preview locally

Any static file server works, for example:

```bash
npx serve .
```
