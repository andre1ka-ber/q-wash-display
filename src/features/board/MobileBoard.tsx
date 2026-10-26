import type { CSSProperties } from 'react';
import { color, type DisplayBoard, type DisplayBoardBox, type DisplayBoardWaitingItem } from 'q-wash-shared';

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Dushanbe',
});

const sectionLabel: CSSProperties = {
  color: color.textTertiary,
  fontSize: 11,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
};

function minutesUntil(item: DisplayBoardWaitingItem, now: number): number {
  return Math.max(0, Math.round((new Date(item.scheduled_start_at).getTime() - now) / 60000));
}

// The board carries no ticket codes, so the last four phone digits stand in
// for them as each booking's on-screen identifier.
function tag(last4: string): string {
  return `••${last4}`;
}

function NowCard({ box, now }: { box: DisplayBoardBox; now: number }) {
  const current = box.current;
  const startMs = current ? new Date(current.scheduled_start_at).getTime() : 0;
  const totalMs = current ? new Date(current.scheduled_end_at).getTime() - startMs : 0;
  const anchor = current?.paused_at ? new Date(current.paused_at).getTime() : now;
  const elapsed = Math.max(0, anchor - startMs);
  const leftMin = current ? Math.max(0, Math.round((totalMs - elapsed) / 60000)) : 0;
  const pct = current && totalMs > 0 ? Math.min(100, (elapsed / totalMs) * 100) : 0;
  const dot = !current ? color.textDim : current.paused_at ? color.warn : color.ok;

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        background: color.panelAlt,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        border: `1px solid ${current ? 'rgba(242,209,75,.3)' : color.borderAlt}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: color.textSecondary, fontSize: 11, fontWeight: 700, letterSpacing: '.1em' }}>
          БОКС {box.number}
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
      </div>
      <div
        style={{
          fontSize: 38,
          fontWeight: 700,
          letterSpacing: '-.05em',
          lineHeight: 1.05,
          color: current ? color.gold : color.textDim,
        }}
      >
        {current ? tag(current.customer_phone_last4) : '—'}
      </div>
      <div
        style={{
          color: color.textSecondary,
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {current ? (current.car_name ?? 'Авто') : box.is_open ? 'Свободен' : 'Закрыт'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: color.textTertiary, fontSize: 11 }}>
          <span>{current ? 'осталось' : 'ожидание'}</span>
          <span style={{ color: color.textPrimaryAlt, fontWeight: 700 }}>{current ? `${leftMin} мин` : '0 мин'}</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: color.borderAlt, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 3, background: color.gold, width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export interface MobileBoardProps {
  board: DisplayBoard;
  now: number;
}

export function MobileBoard({ board, now }: MobileBoardProps) {
  const waiting = board.waiting;
  const averageWait = waiting.length
    ? Math.round(waiting.reduce((sum, item) => sum + minutesUntil(item, now), 0) / waiting.length)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={sectionLabel}>Сейчас обслуживается</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {board.boxes.map((box) => (
          <NowCard key={box.number} box={box} now={now} />
        ))}
      </div>

      <div style={sectionLabel}>Ожидают</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {waiting.length === 0 ? (
          <div style={{ color: color.textFaint, fontSize: 14 }}>Очередь пуста</div>
        ) : (
          waiting.map((item, i) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 16,
                background: i === 0 ? 'rgba(242,209,75,.08)' : color.panelAlt,
                border: `1px solid ${i === 0 ? 'rgba(242,209,75,.34)' : color.borderAlt}`,
              }}
            >
              <div
                style={{
                  width: 62,
                  flex: '0 0 62px',
                  fontSize: 17,
                  fontWeight: 700,
                  letterSpacing: '-.03em',
                  color: i === 0 ? color.gold : color.textMuted,
                }}
              >
                {tag(item.customer_phone_last4)}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ color: color.textPrimaryAlt, fontSize: 13.5, fontWeight: 600 }}>{item.car_name ?? 'Авто'}</div>
                <div style={{ color: color.textTertiary, fontSize: 11.5 }}>
                  {item.service_name ?? 'Услуга'} · Бокс {item.box_number}
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ color: color.textPrimary, fontSize: 15, fontWeight: 700 }}>
                  {timeFormatter.format(new Date(item.scheduled_start_at))}
                </div>
                <div style={{ color: color.textTertiary, fontSize: 11 }}>
                  {i === 0 ? 'следующий' : `${minutesUntil(item, now)} мин`}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {averageWait !== null && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 16,
            border: `1px solid ${color.borderAlt}`,
            background: color.panelAlt,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ color: color.textTertiary, fontSize: 13 }}>Среднее ожидание</div>
          <div style={{ color: color.gold, fontSize: 18, fontWeight: 700 }}>{averageWait} мин</div>
        </div>
      )}
    </div>
  );
}
