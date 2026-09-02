# TODOS

Pending action items for the Nohvum coming-soon site. Items 1 to 3 come from the
design handoff notes (artboard 1e); the rest surfaced during implementation.

## Before publishing

- [x] **Form endpoints.** Both forms post to Formspree form `xjyvwaww` (set in the
      `CONFIG` block of `script.js` and as each form's `action`). Still to do in the
      Formspree dashboard: restrict submissions to the live domain once known, and
      review spam filtering. Free plan is capped at 50 submissions a month.
- [ ] **Role list.** Replace the placeholder options in the hiring form
      (`index.html`, the `role` select): "Tech Lead", "Senior Engineer", "Other".
      Remove the hint "Role list is a placeholder." once confirmed.
- [ ] **Privacy notice URL.** Set `privacyUrl` in `CONFIG`. Required before the page
      collects contact data from GDPR-governed sectors.
- [ ] **Canonical and Open Graph URLs.** `index.html` assumes `https://nohvum.com/`
      for the canonical link and `og:image`. Confirm the domain.
- [ ] **Hiring bubble.** Decide whether it should be visible at launch
      (`showHiring` in `CONFIG`).

## Brand and content

- [ ] **Fonts.** Quicksand and Manrope are the design system's stand-ins for the
      real brand face. When font files arrive, swap the `@font-face` sources and
      `--font-display` / `--font-sans` in `styles.css`.
- [ ] **Vector logo.** The mark and wordmark are raster PNGs from the design
      project. Replace with SVG masters when available.
- [ ] **Copyright line.** "© 2026 Nohvum Ltd" is static. Confirm the legal entity name.

## Deployment

- [ ] **Choose hosting** and deploy the folder as a static site.
- [ ] **Exclude reference files from the deploy:** `design-source/`, `og.html`,
      `TODOS.md`, `README.md`, `.claude/`.
- [ ] **Initialise git** in this folder if the site should be versioned.
- [ ] **After deploy:** check the Open Graph preview with a link debugger, and test
      both forms end to end against the live endpoints.
