# Nohvum website

Static multi-page site built from the agency mockups (g11.co.in demos v7–v10), the layered PSDs and
the animation brief. No build step, no framework.

```
index.html               home
about.html               about
what-we-do.html          Build / Modernise / Run / Secure tabs (#build, #modernise, #run, #secure)
framework.html           lifecycle ring (ring.js) + stage detail (#plan, #build, #test, #deploy, #run, #support)
careers.html             roles + application form (CV as a link)
talk-to-an-expert.html   contact form
assets/css/site.css      tokens, header, footer, buttons, forms, shared components
assets/css/<page>.css    page-specific styles
assets/js/site.js        mobile nav, scroll reveals, Formspree forms, inline-SVG loader
assets/js/<page>.js      page animations
assets/js/ring.js        lifecycle ring (framework: select mode; home hero: overview mode)
assets/css/ring.css      ring pills and canvas styles shared by both pages
assets/js/motion.min.js  Motion 14.6.0 (vanilla UMD build, window.Motion), vendored
assets/fonts/            Selawik (OFL), Microsoft's open-source Segoe UI substitute
assets/svg/, assets/img/ artwork from the PSD asset export; logo from Branding/
og.html, styles.css      only used to render the old coming-soon og-image.png
```

Serve the folder with any static host. To preview locally:

```bash
python3 -m http.server 8080
```

## Type

The mockups are set in Segoe UI, which is licensed with Windows and cannot be self-hosted. The site
uses Selawik under the family name "Nohvum Sans"; `@font-face` asks for a locally installed Segoe UI
first, so Windows visitors get the real face.

## Motion

Every animation plays once (or only on interaction), uses brand colours only, is simplified on small
screens and is skipped entirely under `prefers-reduced-motion`. Content is only hidden for an entrance
when `html.js-motion` is set, so pages render fully without JavaScript. The framework ring is drawn
on a canvas; its labels are HTML buttons (an ARIA tablist) positioned on the ring.

## Before publishing

Open items (search the HTML for `data-todo`):

- Footer **LinkedIn**, **Privacy Policy**, **Cookie Notice** and **Terms** links are `href="#"`.
  Both forms collect personal data, so the privacy policy should exist before launch.
- **Team profiles** on About (names, roles, portraits) come straight from the mockup — confirm they
  are real people and photos you have rights to.
- **Job listings** on Careers (four roles, all dated 15 Oct 2026) are mockup content.
- The framework page's "How governance works" link points to Talk to an expert; no governance page
  exists in the designs. The footer links to `framework.html#governance`.
- `og-image.png` is still the coming-soon card.

## Forms

The two forms post to two separate Formspree forms:

| form | endpoint | subject line | payload |
|---|---|---|---|
| contact (talk-to-an-expert.html) | `https://formspree.io/f/xjyvwaww` | `Nohvum contact request: <name>` | `{form, name, email, company, message, notes}` |
| hiring (careers.html) | `https://formspree.io/f/xdeozele` | `Nohvum application: <name>` | `{form, name, email, role, link}` |

Each still sends a `form` field (`contact` / `hiring`) alongside the subject line,
set client-side via Formspree's `_subject`, so a message stays self-describing
wherever it is forwarded. Formspree uses the `email` field as Reply-To. The endpoint
is each form's `action`; `assets/js/site.js` handles any `form[data-formspree]`.

Requests carry `Accept: application/json`, so Formspree answers JSON instead of
redirecting. On a 4xx, field-level errors (for example a rejected email address)
are shown inline under the form; anything else shows an error that keeps the entered details and offers shrey@nohvum.com.
The honeypot input is named `_gotcha`, which Formspree also treats as a honeypot,
so the no-JavaScript path is covered too.

Formspree's free plan allows 50 submissions a month **across the account**, not per
form, so the two forms share one budget. Submissions and settings (spam filtering,
allowed domains, notification address) live in the Formspree dashboard and are set
per form — configure both.

## Regenerating the Open Graph image

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=8000 --screenshot=assets/og-image.png "file://$PWD/og.html"
```

## Notes on fidelity

- Formspree's free plan does not accept file uploads, so the mockup's "CV upload" is a CV link field.
- The home hero uses the same ring in overview mode, oriented like the original hero art, with a
  15% wider ribbon. It turns clockwise at a steady rate about its own axis (no pointer or drag
  influence) and each stage links to its framework section. The hero fills the first screen. The old `assets/svg/home/banner-chart.svg` is no longer used.
- The framework hero is a port of the "Delivery Loop" reference (`assets/js/ring.js`):
  a canvas ribbon ring whose selected stage turns to the front-centre (rather than the static
  mockup's bottom-left slot). A connector drops from it to the stage detail section below, which
  holds the stage's content; there is no popup card. Drag spins the ring and snaps to a stage. The
  hero has no breadcrumb or divider.
- The homepage no longer has the comparison, "Built around your reality" (now opens About),
  "AI use that fits your environment" (Framework only) or the industry cards (What We Do only),
  so no section appears on two pages.
- `og.html` (and `styles.css`, which only it uses) exists to render the Open Graph image.
