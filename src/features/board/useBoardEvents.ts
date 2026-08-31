import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToBoardEvents, type DisplayBoard } from 'q-wash-shared';

// SSE is the fast path; BoardPage's own refetchInterval polling stays
// untouched as the fallback — this app's own resilience precedent (see
// PLAN.md's Phase E, four real bugs found by killing the API mid-session)
// argues against trusting a single channel exclusively for a screen that
// runs unattended, potentially for days. A pushed frame just writes the
// same react-query cache entry polling already writes to, so a poll tick
// immediately after a push is a harmless no-op refetch, not a race.
export function useBoardEvents(washingPointId: string): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = subscribeToBoardEvents(washingPointId, (board: DisplayBoard) => {
      queryClient.setQueryData(['display', 'board', washingPointId], board);
    });
    return unsubscribe;
  }, [washingPointId, queryClient]);
}
