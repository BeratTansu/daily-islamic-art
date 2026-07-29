# Daily Islamic Art (DIA)

An Islamic art discovery and collection platform. Users discover a new artwork
each day, like them, organize them into collections, set them as wallpapers, and
view the daily artwork on a home-screen widget.

- **Mobile app (React Native + Expo)** — the primary product.
- **Web (Next.js)** — internal admin panel only (curation), not user-facing.

For **production deployment**, see [`TESLIM.md`](./TESLIM.md).
This README covers **local development setup**.

---

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Backend  | NestJS + Prisma + PostgreSQL + Redis |
| Mobile   | React Native + Expo (SDK 57)        |
| Web      | Next.js + Tailwind (admin panel)    |
| Storage  | Cloudflare R2 (S3-compatible) + CDN |
| Language | TypeScript                          |

---

## Repository Structure

A pnpm (v11) monorepo:

```
apps/
  api/        NestJS backend (REST API)
  web/        Next.js admin panel (curation only)
  mobile/     React Native + Expo app (main product)
packages/
  database/   Prisma schema, migrations, generated client, scripts
```

---

## Prerequisites

- **Node.js** 20+
- **pnpm** v11 (`npm install -g pnpm`)
- **Docker Desktop** (runs PostgreSQL + Redis locally)
- **Android emulator** (Android Studio) or a physical device with the
  **Expo dev client** installed — the app uses native modules and does **not**
  run in Expo Go.

---

## Environment Variables

Copy the example files and fill in real values. Never commit filled `.env` files.

| File                       | Purpose                              |
| -------------------------- | ------------------------------------ |
| `.env` (repo root)         | Docker Compose (Postgres credentials/port) |
| `apps/api/.env`            | Backend (JWT, Redis, R2)             |
| `packages/database/.env`   | `DATABASE_URL` for Prisma            |
| `apps/mobile/.env`         | `EXPO_PUBLIC_API_URL` for local dev  |
| `apps/web/.env.local`      | `NEXT_PUBLIC_API_URL`                |

`.env.example` templates are provided where available. For the full variable
list and descriptions, see [`TESLIM.md`](./TESLIM.md) section 1.

> **Note:** The root `.env` is required by `docker-compose.yml` — it reads
> `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `POSTGRES_PORT`.
> Without it, the database container will not start.

---

## Setup

From the repo root:

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Start infrastructure (PostgreSQL + Redis)
pnpm infra:up

# 3. Run database migrations + generate the Prisma client
pnpm db:migrate
pnpm db:generate
```

---

## Running Locally

The startup **order matters**: the backend depends on Docker (Postgres/Redis),
and the web panel depends on the backend. Start them in this order, each in its
own terminal.

```bash
# 0. Make sure Docker Desktop is running, then from the repo root:
pnpm infra:up
# Verify: `docker ps` should show dia_postgres and dia_redis as "Up".

# 1. Backend (http://localhost:3000)
cd apps/api
pnpm run start:dev
# Wait for "Nest application successfully started".

# 2. Web admin panel (http://localhost:3001)
cd apps/web
pnpm run dev

# 3. Mobile app
cd apps/mobile
npx expo start --dev-client
# Open the dev client on your emulator/device and connect to Metro.
```

---

## Local Ports & Addresses

| Service            | Address                                   |
| ------------------ | ----------------------------------------- |
| Backend API        | `http://localhost:3000`                   |
| Web admin panel    | `http://localhost:3001`                   |
| PostgreSQL         | `localhost:5433` (host) → `5432` (container) |
| Redis              | `localhost:6379`                          |
| Prisma Studio      | `pnpm db:studio`                          |

**Mobile → backend addressing:**

- **Android emulator:** the host machine is reachable at `http://10.0.2.2:3000`.
  This is the default in `apps/mobile/.env` if the variable is unset.
- **Physical device:** set `EXPO_PUBLIC_API_URL` to your machine's LAN IP
  (e.g. `http://192.168.1.50:3000`), ensure phone and computer share the same
  network, then restart Metro with `npx expo start -c`. The API URL is embedded
  at build/bundle time, so changing it requires a cache-cleared restart.

> The API has no global prefix — routes are direct: `/auth`, `/artworks`,
> `/artists`, `/health`.

---

## Common Commands

Run from the repo root:

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `pnpm infra:up`     | Start Postgres + Redis (Docker)          |
| `pnpm infra:down`   | Stop them                                |
| `pnpm db:migrate`   | Apply Prisma migrations                  |
| `pnpm db:generate`  | Regenerate the Prisma client             |
| `pnpm db:studio`    | Open Prisma Studio (DB browser)          |

### Database Scripts

Scripts live in `packages/database/scripts/` and `apps/api/scripts/`.

```bash
# Plain Prisma scripts (only PrismaClient) → tsx
cd packages/database
pnpm exec tsx scripts/<FILE>.ts

# Scripts using NestJS DI (@Injectable / NestFactory) → ts-node
cd apps/api
pnpm exec ts-node scripts/<FILE>.ts
```

> **Rule:** if a script uses NestJS dependency injection, run it with `ts-node`.
> `tsx` does not emit decorator metadata, so DI silently fails.

---

## Deployment

Production deployment (env setup, Docker/Nginx, domain/CDN migration, EAS build)
is documented separately in [`TESLIM.md`](./TESLIM.md).
