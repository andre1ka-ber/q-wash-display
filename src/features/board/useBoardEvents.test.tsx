import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DisplayBoard } from 'q-wash-shared';
import { useBoardEvents } from './useBoardEvents';

const unsubscribe = vi.fn();
let capturedOnMessage: ((board: DisplayBoard) => void) | undefined;

vi.mock('q-wash-shared', () => ({
  subscribeToBoardEvents: (_washingPointId: string, onMessage: (board: DisplayBoard) => void) => {
    capturedOnMessage = onMessage;
    return unsubscribe;
  },
}));

const BOARD: DisplayBoard = { boxes_active: 1, boxes_total: 3, boxes: [], waiting: [] };

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useBoardEvents', () => {
  beforeEach(() => {
    unsubscribe.mockClear();
    capturedOnMessage = undefined;
  });

  it('writes pushed board data into the matching react-query cache entry', () => {
    const queryClient = new QueryClient();
    renderHook(() => useBoardEvents('wp-1'), { wrapper: wrapper(queryClient) });

    expect(capturedOnMessage).toBeDefined();
    capturedOnMessage?.(BOARD);

    expect(queryClient.getQueryData(['display', 'board', 'wp-1'])).toEqual(BOARD);
  });

  it('unsubscribes on unmount', () => {
    const queryClient = new QueryClient();
    const { unmount } = renderHook(() => useBoardEvents('wp-1'), { wrapper: wrapper(queryClient) });

    expect(unsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
