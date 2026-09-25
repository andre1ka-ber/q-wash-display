import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authStore, useAuth, color, font, GhostButton, ConfirmDialog } from 'q-wash-shared';
import { LoginPage } from './features/auth/LoginPage';
import { BoardPage } from './features/board/BoardPage';

const queryClient = new QueryClient();

function FullScreenLoader() {
  return <div style={{ minHeight: '100vh', background: color.pageBg }} />;
}

// This app has no point-picker (locked-in design, PLAN.md, same as
// q-wash-cabinet/q-wash-worker) — it assumes the logged-in account is
// scoped to exactly one washing point via User.washing_point_id. The
// display board endpoint (GET .../board) is staff/admin-gated, but
// `worker` is excluded on the backend (unlike boxes/live) and `admin`
// accounts never have a washing_point_id set in this platform — so in
// practice only `staff` can actually use this screen.
function UnsupportedAccount() {
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  return (
    <>
      <div
        style={{
          minHeight: '100vh',
          background: color.pageBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            width: 420,
            maxWidth: '100%',
            background: color.panel,
            border: `1px solid ${color.border}`,
            borderRadius: 20,
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: font.display, color: color.textPrimary, fontSize: 18 }}>
            Этот аккаунт не подходит для экрана очереди
          </div>
          <div style={{ color: color.textMuted, fontSize: 13 }}>
            Экран очереди доступен только сотрудникам, закреплённым за конкретной мойкой. Обратитесь к администратору
            сети.
          </div>
          <GhostButton onClick={() => setLogoutConfirmOpen(true)} style={{ alignSelf: 'center', padding: '11px 22px' }}>
            Выйти
          </GhostButton>
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

export function App() {
  const { status, user } = useAuth();

  useEffect(() => {
    authStore.restore();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {status === 'loading' ? (
        <FullScreenLoader />
      ) : status === 'unauthenticated' ? (
        <LoginPage />
      ) : !user || user.role !== 'staff' || !user.washing_point_id ? (
        <UnsupportedAccount />
      ) : (
        <BoardPage />
      )}
    </QueryClientProvider>
  );
}
