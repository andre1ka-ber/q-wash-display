import { color, font, StatusPill, type StatusPillKind, type DisplayBoardBooking, type DisplayBoardBox } from 'q-wash-shared';

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
}

export function BoardCard({ box }: BoardCardProps) {
  const current = box.current;
  const badge = badgeFor(box);

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
