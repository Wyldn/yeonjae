# Yeonjae (연재)

A clean, dark, mobile-first reader for manhwa, manhua & manga, powered by the public
[MangaDex API](https://api.mangadex.org/docs/). Feature parity with comix-style
aggregators — browse, search, filters, library, history, resume — with a minimal
modern aesthetic.

## Run it

```sh
npm install
npm run dev
```

## Features

- **Home** — most-followed hero, continue-reading rail with live progress, ranked rail, latest updates (built from the chapter feed so every entry is actually readable), top rated
- **Browse** — filter by type (manhwa/manga/manhua via original language), status, and MangaDex genre tags; sort by popularity, rating, recency, A–Z; results paginate with Load more; filters live in the URL so they're shareable
- **Search** — instant debounced overlay (press `/` anywhere) against the full MangaDex catalog
- **Title pages** — live stats (bayesian rating, follows), genres, chapter list with scanlation-group credits and read-state checkmarks, similar-title recommendations, Start/Continue button
- **Reader** — immersive full-screen: vertical webtoon scroll for manhwa/manhua, paged mode for manga (auto-detected, overridable), tap-zone navigation, keyboard arrows, next-page prefetch, width settings, auto-hiding UI, per-chapter progress bar, end-of-chapter next/prev
- **Library & History** — stored as lightweight snapshots in localStorage, so they render instantly and work offline; chapter-level history with resume/reread
- **Mobile-first** — bottom tab bar, safe-area insets, installable PWA manifest

## Architecture

- Vite + React, no router/state dependencies (tiny hash router + `useSyncExternalStore` store)
- `src/api.js` is the only data source — a MangaDex client with a TTL cache and
  in-flight request dedupe. Chapter images come from the MangaDex@Home network
  (`/at-home/server/{chapterId}`).
- All user state persists to `localStorage` under `yeonjae:v2`; library/history/progress
  entries embed a title snapshot so those pages never need the network
- Titles whose English chapters are licensed/delisted (external-only on MangaDex) get a
  clear "read on the official platform" notice instead of a broken reader

## Content notes

Data and images come from MangaDex's free public API. Be a good citizen: keep the
default rate of requests modest, credit scanlation groups (the UI does), and don't
strip the attribution. Heavily licensed titles (e.g. Solo Leveling) are browsable but
their chapters live on official platforms.
