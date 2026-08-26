import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authStore, color, font, ApiError, getDisplayBoard, type DisplayBoardWaitingItem } from 'q-wash-shared';
import { Header } from '../../shared/layout/Header';
import { useClock } from '../../shared/useClock';
import { useMyWashingPointId } from '../../shared/useMyWashingPoint';
import { BoardCard } from './BoardCard';

// Mirrors q-wash-worker's own cadence (see its PLAN.md) — a lobby TV isn't
// noticeably laggy at 8s, and this is the one screen where *other*
// actors (workers advancing a box) need to show up without any local
// action, unlike worker's own poll-plus-refetch-on-own-mutation reasoning.
const REFETCH_INTERVAL_MS = 8_000;

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Dushanbe',
});

function identity(item: DisplayBoardWaitingItem): string {
  return `${item.car_name ?? 'Авто'} · ••${item.customer_phone_last4}`;
}

function relativeNote(item: DisplayBoardWaitingItem, isFirst: boolean, now: number): string {
  if (isFirst) return 'Следующий';
  const minutes = Math.round((new Date(item.scheduled_start_at).getTime() - now) / 60000);
  if (minutes <= 0) return 'уже пора';
  return `через ${minutes} мин`;
}

export function BoardPage() {
  const washingPointId = useMyWashingPointId();
  const now = useClock();

  const boardQuery = useQuery({
    queryKey: ['display', 'board', washingPointId],
    queryFn: () => getDisplayBoard(washingPointId),
    refetchInterval: REFETCH_INTERVAL_MS,
    // react-query pauses refetchInterval when the document isn't focused
    // by default — fine for q-wash-worker/-cabinet, which someone is
    // actively looking at, but wrong here: an unattended lobby TV very
    // plausibly never holds real window focus (no cursor, no window
    // manager interaction, maybe a kiosk browser with no focus concept at
    // all). Found live: this session's automated tab reports
    // document.hidden=true/hasFocus()=false despite being the visible,
    // active tab, and polling silently stopped entirely until this was set.
    refetchIntervalInBackground: true,
    // react-query's default networkMode ('online') pauses fetch attempts
    // entirely once its internal onlineManager decides the browser is
    // offline (fetchStatus: 'paused') — and won't resume on its own
    // without a genuine browser 'online' event, even after the server
    // recovers. Found live: this session's tab got stuck 'paused' with
    // navigator.onLine still true the whole time and the API back up —
    // no window 'online' event ever fired to release it. 'always' skips
    // that heuristic entirely: every interval tick genuinely attempts the
    // fetch, so a real failure surfaces as isError (self-healing once the
    // server answers again) instead of risking an unrecoverable stuck
    // "paused" state on hardware where connectivity APIs may be unreliable.
    networkMode: 'always',
    // The deeper bug 'always' alone didn't fix: react-query's retry-delay
    // wait (query-core's retryer.ts canContinue()) checks
    // focusManager.isFocused() regardless of networkMode — so a failed
    // attempt's retry backoff stays paused forever in a tab that never
    // gains focus, and that stuck attempt blocks every later
    // refetchInterval tick too (confirmed live: requests stopped
    // appearing entirely a few attempts after the server went down, and
    // never resumed even after it came back, until this was set). 0
    // retries means each interval tick is one clean attempt with nothing
    // to get stuck waiting on — the next tick 8s later just tries again.
    retry: 0,
  });

  // This screen runs unattended, potentially for days (PLAN.md's
  // "Resilience" decision) — nothing else in this codebase auto-recovers
  // from a dead refresh token (every other app just shows a manual-login
  // screen next time a human happens to look at it), but that's not good
  // enough for a kiosk nobody's watching. apiRequest already clears
  // tokenStorage when the refresh token itself is dead (see
  // q-wash-shared/api/client.ts); re-triggering authStore.restore() here
  // notices that and flips useAuth().status to 'unauthenticated', which
  // App.tsx's ProtectedRoute then bounces back to the login screen —
  // acceptable manual-intervention recovery, not a silently-stuck screen.
  useEffect(() => {
    if (boardQuery.error instanceof ApiError && boardQuery.error.code === 'session_expired') {
      void authStore.restore();
    }
  }, [boardQuery.error]);

  const board = boardQuery.data;
  const boxes = board?.boxes ?? [];
  const waiting = board?.waiting ?? [];

  // fetchStatus === 'paused' is react-query's own offline-detection state
  // (it stops attempting fetches entirely rather than erroring) — found
  // live during this app's own resilience verification: a real network
  // drop puts the query here, not into isError, so isError alone would
  // leave the screen silently stale with zero signal, exactly what
  // PLAN.md's Phase E warns against.
  const isDisconnected = boardQuery.isError || boardQuery.fetchStatus === 'paused';
  const hadData = board !== undefined;
  const isReconnecting = hadData && isDisconnected;
  const initialError = !hadData && isDisconnected;

  return (
    <div style={{ minHeight: '100vh', background: color.surface, display: 'flex', flexDirection: 'column' }}>
      <Header boxesActive={board?.boxes_active ?? 0} boxesTotal={board?.boxes_total ?? 0} />

      {isReconnecting && (
        <div
          style={{
            padding: '10px 44px',
            background: 'rgba(217,178,106,.12)',
            borderBottom: '1px solid rgba(217,178,106,.4)',
            color: color.warn,
            fontSize: 14,
          }}
        >
          Переподключение… данные на экране могут отставать
        </div>
      )}

      <div style={{ flex: 1, padding: '32px 44px', display: 'flex', gap: 36, alignItems: 'flex-start' }}>
        {initialError ? (
          <div style={{ color: color.bad, fontSize: 16 }}>Не удалось загрузить данные мойки. Переподключение…</div>
        ) : !hadData ? (
          <div style={{ color: color.textFaint, fontSize: 16 }}>Загрузка…</div>
        ) : (
          <>
            <div style={{ flex: '1 1 60%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ fontFamily: font.display, color: color.textPrimary, fontSize: 22 }}>
                Сейчас обслуживается
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                {boxes.map((box) => (
                  <BoardCard key={box.number} box={box} now={now.getTime()} />
                ))}
              </div>
            </div>

            <div style={{ flex: '1 1 40%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ fontFamily: font.display, color: color.textPrimary, fontSize: 22 }}>Ожидают</div>
              <div
                style={{
                  borderRadius: 20,
                  background: color.panel,
                  border: `1px solid ${color.border}`,
                  overflow: 'hidden',
                }}
              >
                {waiting.length === 0 ? (
                  <div style={{ padding: 28, color: color.textFaint, fontSize: 16 }}>Очередь пуста</div>
                ) : (
                  waiting.map((item, i) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '18px 24px',
                        borderBottom: i === waiting.length - 1 ? 'none' : `1px solid ${color.borderAlt}`,
                        background: i === 0 ? 'rgba(217,178,106,.08)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: color.textPrimaryAlt, fontSize: 17, fontWeight: 600 }}>
                          {identity(item)}
                        </div>
                        <div style={{ color: color.textFaint, fontSize: 13 }}>
                          {item.service_name ?? 'Услуга'} · Бокс {item.box_number} ·{' '}
                          {timeFormatter.format(new Date(item.scheduled_start_at))}
                        </div>
                      </div>
                      <div
                        style={{
                          color: i === 0 ? color.gold : color.textFaint,
                          fontSize: 13,
                          fontWeight: i === 0 ? 700 : 400,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {relativeNote(item, i === 0, now.getTime())}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
