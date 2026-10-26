import { useState } from 'react';
import { authStore, useIsMobile, color, font, radius, StatusPill, ConfirmDialog } from 'q-wash-shared';
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
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isMobile) {
    const shortClock = now.toLocaleTimeString('ru-RU', { timeZone: 'Asia/Dushanbe', hour: '2-digit', minute: '2-digit' });
    return (
      <>
        <div style={{ padding: '22px 18px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div
              style={{
                color: color.textPrimary,
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: '-.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {pointName}
            </div>
            <div style={{ color: color.textTertiary, fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase' }}>
              Q Wash · табло
            </div>
          </div>
          <div style={{ color: color.textPrimary, fontSize: 20, fontWeight: 600 }}>{shortClock}</div>
          <button
            type="button"
            aria-label="Выйти"
            onClick={() => setLogoutConfirmOpen(true)}
            style={{
              width: 30,
              height: 30,
              borderRadius: radius.sm,
              border: `1px solid ${color.borderStrong}`,
              background: 'transparent',
              color: color.textFaint,
              cursor: 'pointer',
              fontSize: 13,
              opacity: 0.5,
            }}
          >
            ⎋
          </button>
        </div>
        {logoutConfirmOpen && (
          <ConfirmDialog
            title="Выйти из аккаунта?"
            message="Понадобится снова ввести логин и пароль, чтобы продолжить работу."
            confirmLabel="Выйти"
            onConfirm={() => void authStore.logout()}
            onCancel={() => setLogoutConfirmOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
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
            onClick={() => setLogoutConfirmOpen(true)}
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
      {logoutConfirmOpen && (
        <ConfirmDialog
          title="Выйти из аккаунта?"
          message="Понадобится снова ввести логин и пароль, чтобы продолжить работу."
          confirmLabel="Выйти"
          onConfirm={() => void authStore.logout()}
          onCancel={() => setLogoutConfirmOpen(false)}
        />
      )}
    </>
  );
}
