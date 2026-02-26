# CERT Ad Monitor

Monitor Meta Ad Library campaigns for impersonation, scam, and abuse signals across client brands.

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- shadcn/ui + Radix UI

## Prerequisites

- Node.js 20+
- npm 10+

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. (Optional) Configure environment variables:

```bash
cp .env.example .env.local
```

3. Run development server:

```bash
npm run dev
```

App runs at `http://localhost:3000`.

## Environment Variables

See [`.env.example`](./.env.example).

- `META_AD_LIBRARY_TOKEN` (optional): default token for `/api/ads`
- `PORT` (optional): used in Docker and production runtime

Note: token can also be entered in-app via Settings and persisted in browser storage.

## Docker

Use Docker Compose:

```bash
cp .env.example .env
docker compose up -d --build
```

Stop services:

```bash
docker compose down
```

## Available Scripts

- `npm run dev` - start dev server
- `npm run build` - build for production
- `npm run start` - run production server
- `npm run lint` - run ESLint

## Before Pushing to GitHub

1. Confirm secrets are not tracked:
   - `.env*` files are ignored (except `.env.example`).
   - Do not commit real API tokens.
2. Validate project locally:
   - `npm run lint`
   - `npm run build`
3. Commit with clear message.
4. Push to remote branch and open PR.

## Initial GitHub Push (if repo is new)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```
