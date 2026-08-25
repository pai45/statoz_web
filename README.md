# StatOz Web

StatOz is a Next.js sports platform. The repository is organized around a
shared design system, domain models, and feature-first product modules.

## Local development

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run lint
npm run build
```

Run both checks together with:

```bash
npm run deploy:check
```

## Deployment CLI

Deployments use the project-local Vercel CLI pinned in `package-lock.json`, so
contributors do not need a global installation.

Link the local folder to the correct Vercel account and project once:

```bash
npm run deploy:setup
```

Then create a preview or production deployment:

```bash
npm run deploy
npm run deploy:prod
```

Both deployment commands run lint and a production build before uploading.
When the current commit has already passed CI or `npm run deploy:check`, skip
that repeated preflight:

```bash
npm run deploy -- --skip-checks
npm run deploy:prod -- --skip-checks
```

Additional arguments are forwarded to Vercel, for example
`npm run deploy -- --logs` or `npm run deploy:prod -- --force`.

Keep secrets in Vercel project settings or ignored `.env.*` files. Add only
documented variable names, never credentials, to `.env.example`.

## GitHub Pages

The `main` branch deploys to GitHub Pages through
`.github/workflows/github-pages.yml`. The workflow builds a static Next.js
export for the repository subpath and publishes the generated `out/` directory.

Run the same export locally with:

```bash
npm run build:pages
```

The Pages site is served from
`https://pai45.github.io/statoz_web/`.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the codebase structure.
