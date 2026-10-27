import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DisplayBoardBooking, DisplayBoardBox } from 'q-wash-shared';
import { BoardCard } from './BoardCard';


function makeBooking(overrides: Partial<DisplayBoardBooking> = {}): DisplayBoardBooking {
  return {
    status: 'washing',
    scheduled_start_at: '2026-08-31T10:00:00.000Z',
    scheduled_end_at: '2026-08-31T10:20:00.000Z',
    customer_phone_last4: '1234',
    ...overrides,
  };
}

function makeBox(overrides: Partial<DisplayBoardBox> = {}): DisplayBoardBox {
  return {
    number: 3,
    is_open: true,
    ...overrides,
  };
}

describe('BoardCard badge', () => {
  it('shows "В работе" when a box has an active, unpaused booking', () => {
    render(<BoardCard box={makeBox({ current: makeBooking() })} />);
    expect(screen.getByText('В работе')).toBeInTheDocument();
  });

  it('shows "Пауза" when the active booking is paused', () => {
    render(<BoardCard box={makeBox({ current: makeBooking({ paused_at: '2026-08-31T10:10:00.000Z' }) })} />);
    expect(screen.getByText('Пауза')).toBeInTheDocument();
  });

  it('shows "Закрыт" when there is no active booking and the box is closed', () => {
    render(<BoardCard box={makeBox({ is_open: false })} />);
    // Rendered twice: once in the badge, once in the fallback body text.
    expect(screen.getAllByText('Закрыт')).toHaveLength(2);
  });

  it('shows "Свободен" when there is no active booking and the box is open', () => {
    render(<BoardCard box={makeBox({ is_open: true })} />);
    expect(screen.getAllByText('Свободен')).toHaveLength(2);
  });
});

describe('BoardCard identity', () => {
  it('falls back to "Авто" when no car name is present', () => {
    render(<BoardCard box={makeBox({ current: makeBooking({ car_name: undefined }) })} />);
    expect(screen.getByText('Авто · ••1234')).toBeInTheDocument();
  });

  it('uses the car name when present', () => {
    render(<BoardCard box={makeBox({ current: makeBooking({ car_name: 'Camry' }) })} />);
    expect(screen.getByText('Camry · ••1234')).toBeInTheDocument();
  });
});
