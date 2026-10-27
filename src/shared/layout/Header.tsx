import { useState } from 'react';
import { authStore, useIsMobile, color, font, radius, ConfirmDialog, LogoMark } from 'q-wash-shared';
import { useClock, formatClock } from '../useClock';
import { useMyWashingPoint } from '../useMyWashingPoint';

export interface HeaderProps {
  boxesActive: number;
  boxesTotal: number;
}

export function Header({ boxesActive, boxesTotal }: HeaderProps) {
  const now = useClock();
  const pointQuery = useMyWashingPoint();
  const pointName = pointQuery.data?.name ?? '…';
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
          height: 92,
          flex: '0 0 92px',
          padding: '0 46px',
          borderBottom: `1px solid ${color.borderAlt}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <LogoMark size={46} />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div
              style={{
                color: color.textPrimary,
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: '-.03em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {pointName}
            </div>
            <div style={{ color: color.textTertiary, fontSize: 12, letterSpacing: '.22em', textTransform: 'uppercase' }}>
              Q Wash
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 34, flex: '0 0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: boxesActive > 0 ? color.ok : color.mute,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            <span style={{ animation: 'blink 2s infinite' }}>●</span>
            <span>В работе {boxesActive} из {boxesTotal} боксов</span>
          </div>

          <div style={{ fontFamily: font.display, color: color.textPrimary, fontSize: 34 }}>{formatClock(now)}</div>

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
