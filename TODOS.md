# TODOS

Pending action items for the Nohvum coming-soon site. Items 1 to 3 come from the
design handoff notes (artboard 1e); the rest surfaced during implementation.

## Before publishing

- [x] **Form endpoints.** Contact posts to Formspree form `xjyvwaww`, hiring to
      `xdeozele` (set in the `CONFIG` block of `script.js` and as each form's
      `action`). Still to do in the Formspree dashboard, **for both forms**:
      restrict submissions to the live domain once known, and review spam
      filtering. The 50-submissions-a-month free cap is per account, not per form.
- [x] **Role list.** Resolved by deleting the Role select from the hiring form
      rather than filling it in. An application now sends name, email and link.
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
- [ ] **Privacy notice.** The footer link was deliberately deleted on 2026-09-02.
      The page still collects a name and email from GDPR-governed sectors, so if a
      notice is wanted the `<a>` has to be restored in `index.html` — there is no
      longer a `privacyUrl` value in `CONFIG` to set.

## Deployment

- [ ] **Choose hosting** and deploy the folder as a static site.
- [ ] **Exclude reference files from the deploy:** `og.html`, `TODOS.md`,
      `README.md`, `.claude/`. (`design-source/` is gitignored, so it cannot reach
      a deploy built from the repo.)
- [x] **Initialise git.** Pushed to `github.com:Nohvum/website`.
- [ ] **After deploy:** check the Open Graph preview with a link debugger, and test
      both forms end to end against the live endpoints.
