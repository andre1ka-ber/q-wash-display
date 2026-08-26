import { useQuery } from '@tanstack/react-query';
import { useAuth, getWashingPoint } from 'q-wash-shared';

// Same pattern as q-wash-cabinet/q-wash-worker's own useMyWashingPoint.ts.
// This app's ProtectedRoute (App.tsx) guarantees user.washing_point_id is
// set before the board ever renders, so the assertion here is safe.
// GET /washing-points/{id} is a fully public route (no RBAC needed).
export function useMyWashingPointId(): string {
  const { user } = useAuth();
  return user!.washing_point_id!;
}

export function useMyWashingPoint() {
  const washingPointId = useMyWashingPointId();
  return useQuery({
    queryKey: ['display', 'washing-point', washingPointId],
    queryFn: () => getWashingPoint(washingPointId),
  });
}
