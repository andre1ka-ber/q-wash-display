# q-wash-display

Unattended lobby/reception queue board — the TV screen customers watch,
matching the original "dashboard-app" ask. Full-bleed, no navigation: logs
in once on the kiosk device and stays on one screen indefinitely. Shows no
customer-identifying data at all (no phone/plate/name) — stricter privacy
than every other app in the platform. Talks only to `q-wash-api` over its
documented HTTP API, via `q-wash-shared`'s API client — no direct DB
access, no private endpoints.

Design and scope decisions live in `PLAN.md`; the phase-by-phase
implementation log (including a real multi-bug resilience investigation
against a killed API server) lives in `PROGRESS.md`. Both are the source
of truth for this app's internals — this file is just how to run it.

## Stack

Vite + React 19.2 + TypeScript, `@tanstack/react-query` v5 — polling
(`refetchInterval`, `refetchIntervalInBackground: true`, `retry: 0`,
`networkMode: 'always'`) as the resilient baseline, plus a `useBoardEvents`
SSE hook as a fast path over the same cache (both channels run
concurrently; SSE never replaces polling — see `PLAN.md`'s "Live updates"
decision). No `react-router` — a single screen behind the auth gate, no
further navigation. Depends on `../q-wash-shared` via a `file:` dependency
for theme tokens, the API client, auth, the SSE client, and common
components — not a workspace, this stays a fully separate top-level
project. Vitest + React Testing Library for tests, oxlint for linting.

## Getting started

```bash
npm install
npm run dev      # needs a running q-wash-api
npm run build    # tsc -b && vite build
```

Log in with a `staff`- or `admin`-role account (username + password via
`POST /auth/login` — see `q-wash-api/README.md` for seeded dev accounts).
The refresh token keeps an unattended kiosk session alive indefinitely.

## Testing

```bash
npm test          # vitest run
npm run lint       # oxlint
npx tsc -b         # typecheck
```

## Structure

```
src/
  main.tsx, App.tsx      auth gate (login screen, then the board)
  features/
    auth/                 login screen (shared UI pattern with cabinet/worker)
    board/                 the one real screen: now-serving cards +
                           waiting list + avg-wait footer; BoardCard.tsx,
                           useBoardEvents.ts (SSE)
  shared/
    layout/                Header shell (logo, live box-count, clock)
```
