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

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the codebase structure.
