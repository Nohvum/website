# Nohvum coming-soon page

Static site implementing artboards **1a** (desktop, 1440x900) and **1b** (mobile, 390x844)
of the Claude Design project "Nohvum Coming Soon v2", plus the **1c** Open Graph image.
No build step, no framework.

```
index.html      the page
styles.css      design-system tokens + component styles
script.js       form phases, hiring bubble, CONFIG block
og.html         source for assets/og-image.png (artboard 1c)
assets/         logos, favicons, og-image.png
design-source/  the imported Claude Design project, for reference only
```

Serve the folder with any static host. To preview locally:

```bash
python3 -m http.server 8080
```

## Before publishing

These are the placeholders called out on artboard 1e. All live in the `CONFIG`
block at the top of `script.js`.

1. **Form destinations.** Done. Both forms POST JSON to the Formspree form
   `xjyvwaww` (`contactEndpoint` / `hiringEndpoint` in `CONFIG`; the same URL is
   each form's `action` attribute so a plain POST still works without JavaScript).
   See "Forms" below. If an endpoint is emptied, sends are skipped with a console
   warning and the sent state still shows so the interaction can be reviewed.
2. **Role list.** "Tech Lead", "Senior Engineer", "Other" in `index.html` are placeholders.
3. **Privacy notice URL.** Set `privacyUrl`. Needed before collecting contact data.

Also confirm the canonical URL and `og:image` URL in `index.html` (currently `https://nohvum.com/`).

## Forms

Both forms share one Formspree form (`https://formspree.io/f/xjyvwaww`), so the
inbox tells them apart by the `form` field (`contact` / `hiring`) and the subject
line, set client-side via Formspree's `_subject` field: "Nohvum contact request:
<name>" or "Nohvum application: <name> (<role>)". Formspree uses the `email` field
as Reply-To. The hiring `role` is sent as its visible label ("Tech Lead"), not the
option value.

Requests carry `Accept: application/json`, so Formspree answers JSON instead of
redirecting. On a 4xx, field-level errors (for example a rejected email address)
are shown inline under the form; anything else falls back to the mailto line.
The honeypot input is named `_gotcha`, which Formspree also treats as a honeypot,
so the no-JavaScript path is covered too.

Formspree's free plan allows 50 submissions a month. Submissions and settings
(spam filtering, allowed domains, notification address) live in the Formspree
dashboard.

## Regenerating the Open Graph image

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=8000 --screenshot=assets/og-image.png "file://$PWD/og.html"
```

## Notes on fidelity

- Fonts follow the design system's substitution (Quicksand for display, Manrope for body) from Google Fonts. Swap in the real brand face in `styles.css` when the files arrive.
- The three Lucide icons (check, chevron-down, mail) are inlined as an SVG sprite so the page has no CDN dependency for icons.
- The hero gradient runs orange 500 to 600 so white copy clears WCAG AA, as noted on artboard 1e.
- Do not deploy `design-source/` (it is only a reference copy) or `og.html` if you prefer a tidy root.
