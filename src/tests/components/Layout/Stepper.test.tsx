import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  stage: 'historical' as 'historical' | 'config' | 'optimized',
  hasRun: false,
  maxReached: 0,
  jumpStage: vi.fn(),
}));

vi.mock('~/contexts/SimulatorContext', () => ({
  useSimulator: () => mockState,
}));

import { Stepper } from '~/components/Layout/Stepper';

afterEach(() => {
  cleanup();
  mockState.stage = 'historical';
  mockState.hasRun = false;
  mockState.maxReached = 0;
  mockState.jumpStage.mockClear();
});

describe('Stepper', () => {
  it('renders all steps and locks future steps before first run', () => {
    render(<Stepper />);

    expect(screen.getByRole('button', { name: /historical view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /optimization configuration/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /optimized view/i })).toBeDisabled();
  });

  it('allows stage navigation once unlocked', async () => {
    const user = userEvent.setup();
    mockState.hasRun = true;
    mockState.maxReached = 2;
    mockState.stage = 'config';

    render(<Stepper />);

    await user.click(screen.getByRole('button', { name: /historical view/i }));
    expect(mockState.jumpStage).toHaveBeenCalledWith('historical');
  });

  it('renders done checkmark and lock help title as expected', () => {
    mockState.stage = 'config';
    mockState.hasRun = false;
    mockState.maxReached = 0;

    render(<Stepper />);

    expect(screen.getByRole('button', { name: /historical view/i })).toHaveTextContent('✓');
    expect(screen.getByRole('button', { name: /optimized view/i })).toHaveAttribute(
      'title',
      'stepper.completePreviousStepsFirst',
    );
  });
});
