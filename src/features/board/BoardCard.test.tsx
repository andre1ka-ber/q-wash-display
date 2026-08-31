import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DisplayBoardBooking, DisplayBoardBox } from 'q-wash-shared';
import { BoardCard } from './BoardCard';

const NOW = new Date('2026-08-31T10:30:00.000Z').getTime();

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
    render(<BoardCard box={makeBox({ current: makeBooking() })} now={NOW} />);
    expect(screen.getByText('В работе')).toBeInTheDocument();
  });

  it('shows "Пауза" when the active booking is paused', () => {
    render(<BoardCard box={makeBox({ current: makeBooking({ paused_at: '2026-08-31T10:10:00.000Z' }) })} now={NOW} />);
    expect(screen.getByText('Пауза')).toBeInTheDocument();
  });

  it('shows "Закрыт" when there is no active booking and the box is closed', () => {
    render(<BoardCard box={makeBox({ is_open: false })} now={NOW} />);
    // Rendered twice: once in the badge, once in the fallback body text.
    expect(screen.getAllByText('Закрыт')).toHaveLength(2);
  });

  it('shows "Свободен" when there is no active booking and the box is open', () => {
    render(<BoardCard box={makeBox({ is_open: true })} now={NOW} />);
    expect(screen.getAllByText('Свободен')).toHaveLength(2);
  });
});

describe('BoardCard elapsed/remaining time', () => {
  it('shows elapsed and total minutes for a booking mid-wash', () => {
    render(<BoardCard box={makeBox({ current: makeBooking() })} now={NOW} />);
    // start 10:00, now 10:30 -> 30 elapsed; scheduled duration 20 min.
    expect(screen.getByText(/30:00 из 20 мин/)).toBeInTheDocument();
  });

  it('clamps elapsed time to zero for a booking started ahead of its scheduled slot', () => {
    const early = makeBooking({ scheduled_start_at: '2026-08-31T11:00:00.000Z', scheduled_end_at: '2026-08-31T11:20:00.000Z' });
    render(<BoardCard box={makeBox({ current: early })} now={NOW} />);
    expect(screen.getByText(/00:00 из 20 мин/)).toBeInTheDocument();
  });

  it('anchors elapsed time to paused_at instead of now once paused', () => {
    const paused = makeBooking({ paused_at: '2026-08-31T10:05:00.000Z' });
    render(<BoardCard box={makeBox({ current: paused })} now={NOW} />);
    // paused 5 min after a 10:00 start, regardless of `now` being 10:30.
    expect(screen.getByText(/05:00 из 20 мин/)).toBeInTheDocument();
  });
});

describe('BoardCard identity', () => {
  it('falls back to "Авто" when no car name is present', () => {
    render(<BoardCard box={makeBox({ current: makeBooking({ car_name: undefined }) })} now={NOW} />);
    expect(screen.getByText('Авто · ••1234')).toBeInTheDocument();
  });

  it('uses the car name when present', () => {
    render(<BoardCard box={makeBox({ current: makeBooking({ car_name: 'Camry' }) })} now={NOW} />);
    expect(screen.getByText('Camry · ••1234')).toBeInTheDocument();
  });
});
