# Progress

See `PLAN.md` for the full plan and build order.

- [x] Phase A — Scaffold
- [x] Phase B — Screen against mock data (skipped as a separate step — see log)
- [x] Phase C — Wire to real q-wash-api
- [x] Phase D — SSE upgrade (resumed 2026-08-31, see log below)
- [x] Phase E — Resilience pass

## Log

- 2026-08-20 — Imported the design from Claude Design (`Car Wash Web
  Apps.dc.html`, "Экран очереди" tab), read `q-wash-api` end to end,
  grilled the plan with the user, wrote `PLAN.md`. Renamed from the
  original "dashboard-app" naming to "display" (avoids confusion with
  q-wash-admin's analytics dashboard). Directly supersedes the throwaway
  `pegasus-board` test harness. Nothing built yet.
- 2026-08-20 — Changed the auth design at the user's suggestion: dropped
  the unauthenticated `?token=` scheme in favor of the same
  username+password login every other app uses (matches
  `pegasus-board`'s already-proven unattended-screen pattern — log in
  once, refresh token keeps the session alive). Updated `PLAN.md`
  accordingly; corresponding backend rollback (removed the unused
  `display_token` column) logged in `../q-wash-api/PROGRESS.md`.

- 2026-08-26 — **Built end to end**: backend phase 8 (`GET
  /washing-points/{id}/board`, see `../q-wash-api/PROGRESS.md`) then this
  app in one pass, per the user's own explicit scope decision (unlike
  every other web app this session, the backend endpoint didn't exist yet
  going in — this wasn't just wiring to something already there).

  **Grilled two real gaps with the user before writing any code** (same
  category as boxes'/worker's own gaps earlier this session):
  1. Self-identification without a ticket number. The mock's whole model
     is a huge ticket number per booking, and its own design note says
     *no* phone/plate/name anywhere on this screen (a room full of other
     customers can see it). No ticket concept exists anywhere in the data
     model — a real one would mean a new per-day sequence column on
     `Queue` plus a matching change in `q-wash` (mobile) to show the same
     number, well beyond this endpoint. User picked **car name + last-4
     phone digits** (matching `boxes/live`'s convention) over my
     recommended ticket-free "car name only" — a deliberate, explicit
     divergence from the mock's own privacy intent for this specific
     screen, not an oversight.
  2. Average wait time: dropped entirely for v1 (Recommended, taken) —
     nothing computes this anywhere (`pegasus-board` never had it
     either); same "don't guess a stat the backend doesn't back" call
     already made for boxes/worker's completed-count.

  **Scaffolded** via `npm create vite@latest . --template react-ts`
  (into a scratch dir first, then merged in — the target dir already had
  `PLAN.md`/`PROGRESS.md`, and `create-vite` refuses a non-empty
  directory without `--overwrite`, which would have deleted them).
  Stripped the default `README.md`/`public/`/`.oxlintrc.json`/demo assets
  to match every sibling app's actual layout. No `react-router-dom`
  dependency, unlike the other three apps — `PLAN.md`'s own "Routing:
  none needed beyond the auth gate" decision, followed literally: `App.tsx`
  is plain conditional rendering (loading/login/unsupported-account/board),
  no router at all.

  **Skipped a literal "mock data first" Phase B** — by the time this
  session reached display, the worker/cabinet/boxes precedent this same
  session already established made straight-to-real-data the obviously
  right call (see worker's own PROGRESS.md for why), and the user had
  just approved building backend+app together in one pass anyway. Went
  straight from scaffold to the real `GET .../board` endpoint.

  **`q-wash-shared` additions**: `getDisplayBoard(washingPointId)`
  (`api/queue.ts`) + `DisplayBoard`/`DisplayBoardBox`/
  `DisplayBoardBooking`/`DisplayBoardWaitingItem` types, mirroring
  `LiveBox`'s existing shape.

  **App**: `Header.tsx` (point name/address, "в работе N из M боксов",
  large clock — no completed-count/master-name, unlike worker's header,
  since this screen has neither), `BoardCard.tsx` (2-up grid, same
  elapsed/duration derivation as worker's `BoxCard.tsx`, plus an
  "осталось ~N мин" remaining-time line the mock's own design calls for
  that worker's screen doesn't need), `BoardPage.tsx` (left pane: box
  cards; right pane: flat waiting list, first item highlighted
  "Следующий", others "через N мин" computed live from `now`).
  `LoginPage.tsx`/`useMyWashingPoint.ts`/`useClock.ts` are near-verbatim
  ports of worker's own (only the header icon/title strings differ).

  **Four real bugs found via live resilience testing** (not by reasoning
  about the code — by actually killing the API server mid-session and
  watching what happened), in the order found:

  1. **`BoardCard.tsx`'s "остал ось" stat could show more than the total
     duration.** A booking advanced to `washing` before its own
     `scheduled_start_at` (an early arrival started ahead of schedule)
     made `elapsedMs` negative, so `duration - elapsed` exceeded
     `duration`. Fixed by clamping `elapsedMs` to `>= 0` at the source
     (worker's own `BoxCard.tsx` has the identical unclamped derivation,
     but never surfaces it visibly since it has no "remaining time" stat
     — not touched, since nothing there is actually broken).

  2. **`refetchInterval` silently stopped polling entirely.** React
     Query pauses interval refetches when `document` isn't focused by
     default (fine for worker/cabinet, someone's actively looking at
     those) — but this session's automated browser tab reported
     `document.hidden=true`/`hasFocus()=false` despite being the visible,
     active tab, and a real unattended lobby TV very plausibly never
     holds genuine window focus either (no cursor, no window-manager
     interaction, maybe a kiosk browser with no focus concept at all).
     Fixed with `refetchIntervalInBackground: true`.

  3. **A real network outage left `fetchStatus` stuck `'paused'` (react-
     query's own offline-detection state) instead of `isError`, and it
     never self-healed** — even after the server came back up and stayed
     up, with `navigator.onLine` reporting `true` the entire time. No
     window `online` event ever fired to release react-query's internal
     `onlineManager` from whatever tripped it. The `isReconnecting`
     banner condition only checked `isError`, so this state showed
     nothing at all — a silently-stale screen, exactly what this app's
     own "Resilience" plan section warns against. Fixed the *symptom*
     with `networkMode: 'always'` (skips the online heuristic — every
     interval tick genuinely attempts the fetch) and widened the banner
     condition to `isError || fetchStatus === 'paused'` as a second line
     of defense.

  4. **`networkMode: 'always'` alone didn't actually fix self-healing —
     found by testing the full kill→banner→restart→recovers cycle, not
     by re-reading the config.** Read `@tanstack/query-core`'s own source
     (`retryer.ts`) to find out why: a failed attempt's retry-delay wait
     (`canContinue()`) checks `focusManager.isFocused()` *regardless* of
     `networkMode` — so in an unfocused tab, a failed attempt's retry
     backoff never resolves, and that stuck attempt blocks every later
     `refetchInterval` tick too (confirmed live: real network requests,
     visible via `performance.getEntriesByType('resource')`, stopped
     appearing entirely a few polls into the outage, and never resumed
     even once the server was back). Fixed with `retry: 0` — each
     interval tick is one clean, non-retrying attempt, so there's nothing
     left to get stuck waiting on. **Verified the complete cycle live**:
     killed the API, watched the banner appear (with stale data still
     visible underneath, not a blank/frozen screen), restarted the API,
     watched the banner clear on its own within one poll interval — no
     page reload, no manual intervention, at any point.

- 2026-08-31 — **First test infra in this app** (part of a platform-wide
  push to add missing test coverage — this repo had none). Added Vitest
  4.1.11 + `@testing-library/react` 16.3.3 + `jsdom` 30.0.1 +
  `@testing-library/jest-dom` 7.0.1 as devDeps (compatible with Vite 8 per
  `npm view`), `vitest.config.ts` (jsdom env), `vitest.setup.ts`
  (`@testing-library/jest-dom/vitest` matchers + an explicit
  `afterEach(cleanup)` — RTL's own auto-cleanup registration didn't fire
  with `globals: false`, found by a first failing run with "multiple
  elements found" errors), `npm test` script. Added `@testing-library/
  jest-dom` to `tsconfig.app.json`'s `types` (needed for `tsc -b` to
  recognize `toBeInTheDocument()` etc.).

  Wrote `BoardCard.test.tsx` — exhaustive over the 4 real badge states
  (`box.current` × `paused_at` × `is_open`, not a literal status enum —
  `badgeFor` derives the label from those fields, not from a field on the
  type itself), plus `elapsedMs`/`durationMs`/`formatElapsed` edge cases
  (mid-wash, early-arrival clamped-to-zero, paused anchoring) and the
  `identity()` car-name fallback. Two of the no-`current` cases
  (Закрыт/Свободен) render the same label twice — once in the badge, once
  in the fallback body text — `getAllByText(...).toHaveLength(2)` instead
  of `getByText`, found by the tool's own "multiple elements found" error
  rather than reasoning it out in advance.

  Wrote `useBoardEvents.test.tsx` — mocks `q-wash-shared`'s
  `subscribeToBoardEvents` (the true external from this hook's point of
  view; the hook itself is the unit under test, not mocked) to assert the
  pushed board lands in the exact react-query cache key `BoardPage.tsx`
  polls, and that `unsubscribe` fires on unmount. Hit a real footgun
  writing this one: the mock's `unsubscribe` `vi.fn()` was declared at
  module scope and RTL's `cleanup()` auto-unmounts *every* hook render
  left over from a prior test, so test 2's assertion saw a stale call
  count from test 1's implicit teardown — fixed with
  `beforeEach(() => unsubscribe.mockClear())`.

  Sanity-checked the tests aren't tautological by deliberately breaking
  `badgeFor`'s "Пауза" label mid-session and confirming the corresponding
  test — and only that one — failed, then reverting.

  `npm test` (11/11 pass), `npm run lint` (oxlint, clean), `npx tsc -b`
  (clean) all pass. Did not touch `BoardPage.tsx` (polling+SSE
  integration) or `Header.tsx`/`LoginPage.tsx` — out of scope per this
  task's plan, lower logic density than the two files above.

  5. **`q-wash-shared`'s `authStore.restore()` treated a plain network
     failure identically to a real logged-out state** — found because
     fix #3/#4's testing included a full page reload while the server was
     down, and the app landed back on the login screen afterward even
     though the stored tokens were still perfectly valid. `restore()`'s
     bare `catch { tokenStorage.clear(); ...unauthenticated }` cleared
     valid tokens and forced a logout on *any* error from `getMe()`,
     including `ApiError('network_error', ...)` — not just a genuine
     401/expired-session rejection. This is shared code every one of the
     four web apps calls on mount; it just never mattered for the other
     three, since a human reloading an interactive app during a network
     blip would just retry and rarely notice. It mattered immediately
     here: this is the one app that reloads unattended, so a network
     hiccup at exactly the wrong moment would force a kiosk into a
     spurious logged-out state nobody's there to fix. Fixed in
     `q-wash-shared/src/auth/authStore.ts`: `restore()` now retries up to
     5 times with exponential backoff on `network_error` specifically,
     only clearing tokens and going `unauthenticated` on a real
     rejection (any other `ApiError` code) or once retries are exhausted.
     Re-typechecked all three other web apps against this shared-code
     change — all clean, no regressions.

  **Verification**: `tsc -b`, `oxlint`, `vite build` clean throughout
  (re-run after every fix). Logged in live as `staff` (this endpoint is
  `requireStaff`, not `requireQueueOps` — `worker` cannot use this app at
  all, confirmed the `UnsupportedAccount` fallback renders correctly for
  a non-qualifying session too). Created real bookings via the actual
  customer OTP+`POST /queue` flow (not raw SQL) for today, advanced one
  to `washing`, backdated its `scheduled_start_at` via direct SQL by 15
  minutes specifically to watch the elapsed-time bar tick for real
  (harmless test-only DB touch, not exercising business logic — same
  technique used for worker's own verification). Confirmed live: one-box
  busy + two-box-free rendering, the waiting list's "Следующий"/"через N
  мин" labels, pause freezing the progress bar exactly (two zoomed
  screenshots showing an identical value 9s apart) and resume picking
  real elapsed time back up, finish freeing the box and decrementing
  "в работе N из M" correctly, and the closed-box "Закрыт" badge (closed
  Box 3 via the real API as `staff`, confirmed the display reflected it,
  reopened it after). Cleaned up all test bookings afterward via the
  cancel/finish endpoints (not raw SQL) to leave demo data as `make seed`
  left it.

  **Still open**: SSE (Phase D) — deliberately not built, matches
  `PLAN.md`'s polling-first decision, not required for v1. A true
  multi-day unattended run has obviously not been verified (only this
  session's length) — the fixes above address the *specific* failure
  modes actually found, not a guarantee against everything a real week
  of uptime could surface.

- 2026-08-31 — **Phase D resumed and built**: `GET
  /washing-points/{id}/board/events` (new `q-wash-api` endpoint, see its
  own `PROGRESS.md`) wired in via a new `useBoardEvents` hook
  (`src/features/board/useBoardEvents.ts`) that subscribes through
  `q-wash-shared`'s new `subscribeToBoardEvents` and writes each pushed
  frame straight into the existing `['display', 'board', washingPointId]`
  react-query cache entry with `setQueryData`. The existing
  `refetchInterval` polling in `BoardPage.tsx` was left completely
  untouched, on purpose — SSE is the fast path, polling stays the
  fallback, per this app's own Phase E precedent against trusting a
  single channel for a screen that runs unattended for potentially days.

  **Live verification** against a real running `q-wash-api` (staff login,
  `npm run dev` here): confirmed the stream actually connects
  (`GET .../board/events` returns 200 and stays open in the network
  panel, not just polling); closed a box via a real `PATCH` from a second
  terminal session (not through this UI) and watched the card flip to
  "Закрыт" essentially instantly, well inside the 8s poll interval;
  reopened it the same way. Then repeated this session's own
  resilience-testing method from Phase E: killed the `q-wash-api` process
  mid-session, confirmed the existing "Переподключение…" banner still
  appears (polling's own error handling, unaffected by this change),
  restarted the API, and confirmed both channels recovered on their
  own — polling resumed on its next tick, and the SSE stream reconnected
  a few attempts later once the backoff coincided with the server being
  back (`q-wash-shared`'s new client backs off 1s→2s→4s→…→30s-capped
  instead of a bounded retry count, since there's no equivalent "give up"
  state for a stream whose whole job is being a nice-to-have fast path
  over an already-resilient poll). Cleaned up the test box state
  afterward via the real API, not raw SQL.

  `tsc -b`, `oxlint`, `vite build` all clean. No console errors at any
  point in this pass.

- 2026-09-19 — **New palette/font/logo from Claude Design.** Picked up
  `q-wash-shared`'s new `theme/tokens.ts` values (near-black palette,
  single Sora font) and its new `LogoMark` component (replaces the old
  bordered letter badge in the sidebar/header/login screen — no
  app-specific logic changed, see `q-wash-shared/PROGRESS.md`). Locally:
  removed the `theme/fonts.css` import from `main.tsx` and added the
  Google Fonts `<link>`s + an inline-SVG favicon (same logo mark) to
  `index.html` — self-hosted Manrope/Prata dropped in favor of the CDN.
  `npm run build` and `npm test` both clean.
