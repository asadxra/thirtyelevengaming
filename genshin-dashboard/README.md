# Genshin Studio (Instagram dashboard)

Moved here from the claude.ai artifact "Genshin Instagram dashboard". It is a
plain static page: no build step.

## Run it locally

Browsers block `fetch()` from `file://`, so serve the folder:

```bash
cd genshin-dashboard && python3 -m http.server 8000
```

Then open http://localhost:8000.

## What's in here

| Path | What it is |
| --- | --- |
| `index.html` | The page (markup, styles and app script from the artifact). |
| `theme.css` | The light design layer: soft colours, card styling, the sidebar menu and the phone pill menu. |
| `runtime.js` | Local stand-ins for the claude.ai `dash` and `claude.use()` APIs the page was written against. |
| `data/*.json`, `data/posts.csv` | The dashboard's datasets (characters, stories, hashtags, versions, caption parts, posts). |
| `data/seed-db.json` | Export of the artifact's database: build guides, weapons, portraits, domain posters, settings. |
| `img/` | Element icons the page uses. |
| `vendor/d3.min.js` | d3 v7.9.0 (ISC licence in `vendor/d3-LICENSE`). |

## How saving works now

Edits (builds, settings, domain posters, uploaded images) are saved in **your
browser's** local storage, seeded from `data/seed-db.json` on first visit. They
are not shared between browsers or devices. To go back to the exported data,
run `gxResetData()` in the browser console.

To change the starting data for everyone, edit the files in `data/`.

## What no longer runs on its own

The "ask Claude" features (research a new build or weapon guide, Script,
YouTube comments, Analyse, update summaries) worked by writing a request into
the artifact's database for a Claude session to pick up. Here they still save
the request, but nothing answers it.
