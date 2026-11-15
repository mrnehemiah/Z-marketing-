# ZUNE Marketplace 2.0 — deployment and asset maintenance

## Repository model

The live site currently deploys the repository root through GitHub Pages/Jekyll. Keep application HTML, CSS, JavaScript, and Supabase client modules at the root. Do not move application files into a new build directory as part of routine maintenance.

## Before deployment

Install the development tooling once:

```sh
npm install
npm run check
```

The check validates JavaScript syntax, local HTML asset references, relative JavaScript imports, and scans frontend source for likely privileged Supabase secrets. It does not replace browser testing or Supabase RLS checks.

## Optional asset minification

Run:

```sh
npm run optimize
```

This creates separate `.min.js` and `.min.css` copies plus `optimization-report.json`. Original files are not overwritten. The generated copies are ignored by Git by default and are not automatically served by GitHub Pages. Test module imports and page behavior before changing any production HTML references; do not link a minified entry point until its complete dependency graph is available and verified.

## Deployment stability

Avoid pushing many tiny commits in rapid succession. GitHub Pages may cancel an in-progress deployment when a newer commit arrives. Prefer one tested commit containing a related group of changes, then wait for the latest Pages build and deploy jobs to finish successfully before checking the live URL.

## Safe-change rules

- Preserve Vanilla JavaScript and the existing Supabase client integration.
- Never put a Supabase service-role key in browser code.
- Do not delete working modules to reduce file size.
- Optimize images separately (resize to display dimensions and use WebP/AVIF where supported); keep original uploads in Supabase Storage rather than committing product photos to the app repository.
- Re-run `npm run check` after changes and verify the affected page on mobile.
