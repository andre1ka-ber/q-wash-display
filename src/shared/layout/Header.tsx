import { authStore, color, font, radius, StatusPill, LogoMark } from 'q-wash-shared';
import { useClock, formatClock, formatDayLabel } from '../useClock';
import { useMyWashingPoint } from '../useMyWashingPoint';

export interface HeaderProps {
  boxesActive: number;
  boxesTotal: number;
}

export function Header({ boxesActive, boxesTotal }: HeaderProps) {
  const now = useClock();
  const pointQuery = useMyWashingPoint();
  const pointName = pointQuery.data?.name ?? '…';
  const pointAddress = pointQuery.data?.address ?? '';

  return (
    <div
      style={{
        padding: '28px 44px',
        borderBottom: `1px solid ${color.borderAlt}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 28,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
        <LogoMark size={54} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: font.display,
              color: color.textPrimary,
              fontSize: 26,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {pointName}
          </div>
          <div style={{ color: color.textFaint, fontSize: 15 }}>{pointAddress}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 28, flex: '0 0 auto' }}>
        <StatusPill kind={boxesActive > 0 ? 'ok' : 'mute'}>
          В работе {boxesActive} из {boxesTotal} боксов
        </StatusPill>

        <div
          style={{
            textAlign: 'right',
          }}
        >
          <div
            style={{
              fontFamily: font.display,
              color: color.textPrimary,
              fontSize: 34,
              lineHeight: 1,
            }}
          >
            {formatClock(now)}
          </div>
          <div style={{ color: color.textFaint, fontSize: 14, textTransform: 'capitalize', marginTop: 4 }}>
            {formatDayLabel(now)}
          </div>
        </div>

        {/* Unobtrusive, kiosk-admin-only affordance — nobody working the
            floor is expected to click this; it's here for whoever swaps
            the device out of service. */}
        <div
          onClick={() => void authStore.logout()}
          title="Выйти"
          style={{
            width: 34,
            height: 34,
            borderRadius: radius.sm,
            border: `1px solid ${color.borderStrong}`,
            color: color.textFaint,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 15,
            opacity: 0.5,
          }}
        >
          ⎋
        </div>
      </div>
    </div>
  );
}
