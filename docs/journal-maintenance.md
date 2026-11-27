# Private Research Journal

## Storage and Deployment

- Public source contains templates, CSS, schema and server code only.
- Research HTML lives in the `my-studio-journal` D1 database (`JOURNAL_DB`).
- `JOURNAL_PASSWORD` is a Cloudflare Pages encrypted secret, never a source constant.
- Both production and preview must fail closed when bindings or secrets are missing.
- `node scripts/build-site.mjs` copies only public assets into `dist`.
- Configure the Pages Git build command to `node scripts/build-site.mjs`, output `dist`.
- Never upload a source folder containing drafts, SQL exports or credentials as static assets.

## Updating a Journal

1. Review the research draft and preserve historical validation dates and limitations.
2. Use `scripts/prepare-journal.cjs` with markdown-it 14.x on a trusted local draft.
3. The generated SQL must be outside this repository and deployment directory.
4. Import into D1 with `wrangler d1 execute my-studio-journal --remote --file <private.sql>`.
5. Confirm unauthenticated requests cannot obtain any research data before sharing the link.

The initial importer handles the four agreed PtNiPTA topics and refuses an unexpected draft structure.
For later weeks, explicitly review chronological additions rather than overwriting history silently.
Do not upload internal audit notes, raw research bundles, POTCAR or WAVECAR.

## Authentication

- Server-side password check with fixed-size timing-safe digest comparison.
- Eight login attempts per IP per 15-minute window, enforced by atomic D1 update.
- Random session tokens; only token hashes stored in D1.
- Secure, HttpOnly, SameSite=Strict, host-only cookies, seven-day expiry.
- Logout revokes the session; password rotation invalidates all existing sessions.
- Same-origin POST required; content and login responses are private/no-store.
- No unauthenticated document endpoint, static copy, source map or research attachment exists.
- Access is shared: anyone with the password can read; this does not identify individual readers.

## Accessibility

Native labeled password form, status feedback, skip link, keyboard focus, heading hierarchy,
native disclosure controls and keyboard-scrollable named table regions.
New journal routes do not require client JavaScript. Existing site theme is reused.
