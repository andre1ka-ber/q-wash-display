import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type DisplayBoard, type User } from 'q-wash-shared';
import { BoardPage } from './BoardPage';

const getDisplayBoard = vi.fn();
const restore = vi.fn();
let pushBoard: ((board: DisplayBoard) => void) | null = null;

vi.mock('q-wash-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('q-wash-shared')>();
  return {
    ...actual,
    authStore: { ...actual.authStore, restore: (...a: unknown[]) => restore(...a) },
    useAuth: () => ({ status: 'authenticated', user: fakeUser }),
    getWashingPoint: () => Promise.resolve({ id: 'wp-1', name: 'Pegasus', address: 'ул. Рудаки, 84' }),
    getDisplayBoard: (...a: unknown[]) => getDisplayBoard(...a),
    subscribeToBoardEvents: (_id: string, onBoard: (board: DisplayBoard) => void) => {
      pushBoard = onBoard;
      return () => {
        pushBoard = null;
      };
    },
  };
});

const fakeUser: User = { id: 'u1', phone_number: '+992000000000', name: 'Kiosk', role: 'staff', washing_point_id: 'wp-1', last_login_at: null };

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

function board(over: Partial<DisplayBoard> = {}): DisplayBoard {
  return {
    boxes_active: 1,
    boxes_total: 2,
    boxes: [
      {
        number: 1,
        is_open: true,
        current: { status: 'washing', service_name: 'Экспресс', scheduled_start_at: inMinutes(-5), scheduled_end_at: inMinutes(25), customer_phone_last4: '1111', car_name: 'Camry' },
      },
      { number: 2, is_open: true },
    ],
    waiting: [
      { id: 'w1', status: 'waiting', box_number: 2, service_name: 'Детейлинг', scheduled_start_at: inMinutes(3), customer_phone_last4: '2222', car_name: 'Lada' },
      { id: 'w2', status: 'queue', box_number: 2, scheduled_start_at: inMinutes(45), customer_phone_last4: '3333' },
    ],
    ...over,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BoardPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getDisplayBoard.mockResolvedValue(board());
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  pushBoard = null;
});

describe('BoardPage', () => {
  it('shows the boxes, the box counter and the waiting list', async () => {
    renderPage();
    expect(await screen.findByText('Сейчас обслуживается')).toBeInTheDocument();
    expect(screen.getByText('В работе 1 из 2 боксов')).toBeInTheDocument();
    expect(screen.getByText('В работе')).toBeInTheDocument(); // box 1's badge
    expect(screen.getAllByText('Свободен').length).toBeGreaterThan(0); // box 2 (badge + body)
    expect(screen.getByText(/Lada · ••2222/)).toBeInTheDocument();
    expect(screen.getByText(/Авто · ••3333/)).toBeInTheDocument(); // no car name -> generic
  });

  it('marks the first waiting booking as next and gives the others a relative time', async () => {
    renderPage();
    await screen.findByText(/Lada/);
    expect(screen.getByText('Следующий')).toBeInTheDocument();
    expect(screen.getByText(/через 4[4-5] мин/)).toBeInTheDocument();
  });

  it('says so when nobody is waiting', async () => {
    getDisplayBoard.mockResolvedValue(board({ waiting: [] }));
    renderPage();
    expect(await screen.findByText('Очередь пуста')).toBeInTheDocument();
  });

  it('starts with a loading state', () => {
    getDisplayBoard.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });

  it('shows an error when the very first load fails', async () => {
    getDisplayBoard.mockRejectedValue(new Error('down'));
    renderPage();
    expect(await screen.findByText(/Не удалось загрузить данные мойки/)).toBeInTheDocument();
  });

  it('keeps the last data and warns that it may be stale when a refresh fails', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <BoardPage />
      </QueryClientProvider>,
    );
    await screen.findByText(/Lada/);

    getDisplayBoard.mockRejectedValue(new Error('down'));
    await act(async () => {
      await client.refetchQueries({ queryKey: ['display', 'board', 'wp-1'] });
    });
    expect(await screen.findByText(/Переподключение/)).toBeInTheDocument();
    expect(screen.getByText(/Lada/)).toBeInTheDocument();
  });

  it('applies a board pushed over SSE without waiting for the poll', async () => {
    renderPage();
    await screen.findByText(/Lada/);
    expect(pushBoard).not.toBeNull();

    act(() => pushBoard!(board({ waiting: [{ id: 'w9', status: 'queue', box_number: 1, scheduled_start_at: inMinutes(10), customer_phone_last4: '9999', car_name: 'Pushed' }] })));
    expect(await screen.findByText(/Pushed · ••9999/)).toBeInTheDocument();
    expect(screen.queryByText(/Lada/)).not.toBeInTheDocument();
  });

  it('re-checks the session when the refresh token is dead, so the kiosk returns to login', async () => {
    getDisplayBoard.mockRejectedValue(new ApiError('session_expired', 'expired', 401));
    renderPage();
    await waitFor(() => expect(restore).toHaveBeenCalled());
  });
});
