# q-wash-display — Plan

Source design: Claude Design project "Car wash queue app"
(`Car Wash Web Apps.dc.html`), the "Экран очереди" tab, imported
2026-08-20. Backend: `../q-wash-api`, extended per
`../q-wash-api/docs/PLAN_WEB_APPS.md` — blocked on that plan's phase 8
(the display-board summary endpoint).

Unattended lobby/reception screen — the bank-or-clinic-style live queue
display, matching the original ask's "dashboard-app". Renamed to
"q-wash-display" (the mock's own label is "Экран очереди", queue *screen*)
to avoid confusion with `q-wash-admin`'s analytics dashboard, which is a
completely different kind of screen for a completely different audience.
Directly supersedes the throwaway `pegasus-board` test harness.

## What the design actually is

Full-bleed dark layout, no sidebar/nav — this runs on a TV, nobody
navigates it:

- **Header**: logo + point name, a live "в работе N из M боксов" (N of M
  boxes active) indicator, a large clock.
- **Left pane — "Сейчас обслуживается" (currently serving)**: one large
  card per box (2-up grid) — box label, status badge, the ticket number in
  huge serif type, car + service, a "осталось / ожидание" (time
  left/waiting) progress bar. A free box shows "Свободен" / "Подъезжайте
  без ожидания" instead of a ticket.
- **Right pane — "Ожидают" (waiting)**: a vertical list of upcoming
  tickets — ticket number, car, service, scheduled time, a relative note
  ("следующий" / "через N мин"), the next-up row visually highlighted. A
  footer strip shows average wait time.

Notably **no phone numbers, plates, or names anywhere** — less customer
data than `pegasus-board` already shows today (which displays last-4
phone digits). This is the strictest-privacy of the four apps almost by
construction, since it's the one meant to be visible to a room full of
other customers.

## Decisions locked in (with the user)

- **Framework**: Vite + React + TypeScript.
- **Shared package**: depends on `../q-wash-shared` via `file:` dependency,
  including its auth module — same as the other three apps (decided with
  the user, superseding an earlier unauthenticated-token-in-URL design).
- **Fidelity**: close visual port — this one matters more than usual, since
  it's the one app whose entire job is being looked at from across a room
  (large type, high contrast already baked into the mock).
- **Auth**: username + password via `POST /auth/login`, same as
  `q-wash-cabinet`/`q-wash-worker` — logged in once on the kiosk device,
  the rotating refresh token keeps the session alive indefinitely with no
  one re-entering credentials, following `pegasus-board`'s already-proven
  pattern for exactly this unattended-screen scenario. No `?token=` URL
  scheme, no separate auth mechanism to build in `q-wash-shared`.
- **Live updates**: SSE preferred once `PLAN_WEB_APPS.md` phase 8's
  optional SSE variant ships (this is exactly the kind of screen where
  *other* actors — the worker app advancing a box — need to show up
  without any local action, unlike `q-wash-worker`'s own polling
  decision). Ship on polling first (matching `pegasus-board`'s existing
  8-second interval) so the app isn't blocked waiting on the SSE variant
  specifically, and upgrade the transport later without changing the UI.

## App architecture

```
q-wash-display/
  PLAN.md
  PROGRESS.md
  package.json          depends on q-wash-shared via file:../q-wash-shared
  vite.config.ts
  src/
    main.tsx
    App.tsx               auth gate (login screen, then the board) — one
                          screen once logged in, no further navigation
    features/
      auth/                 login screen, shared with q-wash-cabinet/
                            q-wash-worker's own via q-wash-shared/auth
      board/                the one real screen: now-serving cards +
                            waiting list + avg-wait footer
    shared/
      layout/                Header shell (logo, live box-count, clock)
                             specific to this app
```

- **Routing**: none needed beyond the auth gate — single screen once
  logged in.
- **Data/server-state**: `@tanstack/react-query` with `refetchInterval`
  (polling phase) or a subscription hook in `q-wash-shared/sse` (once SSE
  ships) — both read the same normalized board shape so swapping the
  transport doesn't touch the rendering components.
- **Resilience**: this runs unattended, potentially for days — needs to
  survive a token refresh cycle and a transient network blip without
  crashing to a white screen; a full-page error state with an auto-retry,
  not a thrown exception. Re-showing the login screen if the refresh token
  itself ever expires/is revoked is an acceptable (if manual-intervention)
  fallback, same exposure `pegasus-board` already has today.
- **Localization**: Russian only, matching the mock.

## Phased build order

- [x] **A — Scaffold**: Vite react-ts, `q-wash-shared` wired in (theme,
      API client, auth module), login screen.
- [x] **B — Screen against mock data**: skipped as a separate step — see
      `PROGRESS.md`. Went straight to real data, same as this session's
      worker/cabinet precedent already established.
- [x] **C — Wire to real `q-wash-api`**: built `PLAN_WEB_APPS.md` phase 8
      (`GET /washing-points/{id}/board`) in the same pass — see
      `../q-wash-api/PROGRESS.md`. Polling, not SSE (below).
- [x] **D — SSE upgrade**: built 2026-08-31, alongside as a fast path over
      the existing polling (kept as fallback, not replaced) — see
      `PROGRESS.md`.
- [x] **E — Resilience pass**: done, and more thoroughly than originally
      scoped — four real bugs were found by actually killing the API
      server mid-session and watching what happened, not by reasoning
      about the config: `refetchInterval` silently stopping in an
      unfocused tab (`refetchIntervalInBackground: true`), react-query's
      offline-detection state (`fetchStatus: 'paused'`) getting
      permanently stuck even after the server recovered
      (`networkMode: 'always'` plus widening the reconnecting-banner
      condition), a deeper retry-pause-on-blur issue inside
      `@tanstack/query-core` itself that blocked *all* later polls once
      one attempt got stuck (`retry: 0`), and a `q-wash-shared`-level bug
      where `authStore.restore()` forced a spurious logout on a plain
      network failure, not just a real auth rejection (fixed in shared
      code, benefits all four web apps). The full kill→banner→restart→
      recovers cycle was verified live with no page reload and no manual
      intervention at any point. See `PROGRESS.md` for the full
      root-cause write-up on each. **Not** verified: an actual multi-day
      unattended run — the fixes address the specific failure modes this
      session actually found, not everything a real week of uptime could
      surface.

Progress against this list, decisions made along the way, and anything
discovered that changes the plan are logged in `PROGRESS.md` as work
happens.
