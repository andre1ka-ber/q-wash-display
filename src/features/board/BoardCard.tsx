import { color, font, radius, StatusPill, type StatusPillKind, type DisplayBoardBooking, type DisplayBoardBox } from 'q-wash-shared';

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Same derivation as q-wash-worker's BoxCard — no "washing started at"
// field exists on the backend, only scheduled_start_at/paused_at. Clamped
// to >= 0: a booking can be advanced to washing before its own scheduled
// start (an early arrival started ahead of its slot) — without this, the
// "осталось ~N мин" stat below would show more than the total duration.
function elapsedMs(booking: DisplayBoardBooking, now: number): number {
  const anchor = booking.paused_at ? new Date(booking.paused_at).getTime() : now;
  return Math.max(0, anchor - new Date(booking.scheduled_start_at).getTime());
}

function durationMs(booking: DisplayBoardBooking): number {
  return new Date(booking.scheduled_end_at).getTime() - new Date(booking.scheduled_start_at).getTime();
}

// No ticket-number field exists anywhere in the data model — car name +
// last-4 phone digits is this screen's self-identification method
// instead, decided with the user despite the mock's own no-phone-numbers
// design note (see PLAN.md/PROGRESS.md for the full reasoning).
function identity(booking: DisplayBoardBooking): string {
  return `${booking.car_name ?? 'Авто'} · ••${booking.customer_phone_last4}`;
}

interface BadgeInfo {
  kind: StatusPillKind;
  label: string;
}

function badgeFor(box: DisplayBoardBox): BadgeInfo {
  if (box.current) return box.current.paused_at ? { kind: 'warn', label: 'Пауза' } : { kind: 'ok', label: 'В работе' };
  if (!box.is_open) return { kind: 'bad', label: 'Закрыт' };
  return { kind: 'mute', label: 'Свободен' };
}

export interface BoardCardProps {
  box: DisplayBoardBox;
  now: number;
}

export function BoardCard({ box, now }: BoardCardProps) {
  const current = box.current;
  const badge = badgeFor(box);
  const progressPct = current ? Math.min(100, (elapsedMs(current, now) / durationMs(current)) * 100) : 0;

  return (
    <div
      style={{
        borderRadius: 26,
        background: color.panelAlt,
        border: `1px solid ${current ? (current.paused_at ? 'rgba(242,209,75,.32)' : 'rgba(143,203,134,.3)') : color.border}`,
        animation: current && !current.paused_at ? 'pulseRing 3.2s ease-out infinite' : undefined,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        minHeight: 220,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: color.textSecondary, fontSize: 19, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>
          Бокс {box.number}
          {box.label ? ` · ${box.label}` : ''}
        </div>
        <StatusPill kind={badge.kind}>{badge.label}</StatusPill>
      </div>

      {current ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8, margin: 'auto 0' }}>
            <div style={{ fontFamily: font.display, color: color.gold, fontSize: 36, lineHeight: 1.15 }}>
              {identity(current)}
            </div>
            <div style={{ color: color.textTertiary, fontSize: 16 }}>{current.service_name ?? 'Услуга'}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
            <div style={{ height: 10, borderRadius: radius.pill, background: color.input, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPct}%`,
                  height: '100%',
                  borderRadius: radius.pill,
                  background: current.paused_at ? color.warn : color.gold,
                  transition: 'width 1s linear',
                }}
              />
            </div>
            <div style={{ color: color.textFaint, fontSize: 14 }}>
              осталось ~{Math.max(0, Math.round((durationMs(current) - elapsedMs(current, now)) / 60000))} мин ·{' '}
              {formatElapsed(elapsedMs(current, now))} из {Math.round(durationMs(current) / 60000)} мин
            </div>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8, margin: 'auto 0' }}>
          <div style={{ fontFamily: font.display, color: color.textDim, fontSize: 56, lineHeight: 1 }}>—</div>
          <div style={{ color: color.textSecondary, fontSize: 19, fontWeight: 600 }}>{box.is_open ? 'Свободен' : 'Закрыт'}</div>
          {box.is_open && <div style={{ color: color.textTertiary, fontSize: 16 }}>Подъезжайте без ожидания</div>}
        </div>
      )}
    </div>
  );
}
