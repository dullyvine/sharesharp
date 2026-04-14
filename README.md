# Share Sharp

Share Sharp is a Next.js file-transfer app built for Cloudflare Workers.

## How it works

- The frontend is a Next.js App Router app.
- The backend is handled by Next route handlers running inside a Cloudflare Worker via `@opennextjs/cloudflare`.
- File metadata lives in Cloudflare D1.
- File bytes live in Cloudflare R2.
- A scheduled Worker cleanup job removes expired uploads every hour.

## Current Cloudflare state

- A real D1 database named `sharesharp-db` has already been created.
- The `transfers` table migration has already been applied to that D1 database.
- `wrangler.jsonc` already contains the real D1 database ID.
- R2 is still not ready on this account. Cloudflare returned `10042: Please enable R2 through the Cloudflare Dashboard.`

That means:

- The code is wired for Cloudflare.
- D1 is real and connected.
- R2 storage is still blocked by the account setting, so production file storage cannot work until R2 is enabled and the bucket is created.

## Local development

Install dependencies:

```bash
npm install
```

Generate Worker binding types after config changes:

```bash
npm run cf-typegen
```

Apply the local D1 migration:

```bash
npm run db:migrate:local
```

Run the Next.js dev server:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

## Cloudflare deployment

This project is meant for **Cloudflare Workers**, not a plain Cloudflare Pages static build.

### Required before deploy

1. Enable R2 in the Cloudflare dashboard for this account.
2. Create an R2 bucket named `sharesharp-uploads`.
3. Make sure `wrangler login` is done locally if you want to deploy from your machine.

### Deploy commands

```bash
npm run deploy
```

If you want to preview the built Worker locally:

```bash
npm run preview
```

## Important note about storage

- In local development, files are stored in Wrangler's local simulation under `.wrangler/`.
- In production, files will be stored in the R2 bucket bound as `UPLOADS`.
- They are not being stored in browser local storage.
- They are not being stored inside D1 as blobs.
