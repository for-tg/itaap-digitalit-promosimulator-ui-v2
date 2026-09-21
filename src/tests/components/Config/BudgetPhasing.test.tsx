import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  updateConfig: vi.fn(),
  config: {
    budgetMode: 'Constrained',
    refYear: 2025,
    budgetMult: 100,
    qSplitMode: 'actual',
    qSplit: { Q1: 25, Q2: 25, Q3: 25, Q4: 25 },
    mode: 'Retrospective',
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('~/contexts/SimulatorContext', () => ({
  useSimulator: () => mockState,
}));

import { BudgetPhasing } from '~/components/Config/BudgetPhasing';

afterEach(() => {
  cleanup();
  mockState.updateConfig.mockClear();
});

beforeEach(() => {
  mockState.config.budgetMode = 'Constrained';
  mockState.config.refYear = 2025;
  mockState.config.budgetMult = 100;
  mockState.config.qSplitMode = 'actual';
  mockState.config.qSplit = { Q1: 25, Q2: 25, Q3: 25, Q4: 25 };
  mockState.config.mode = 'Retrospective';
});

describe('BudgetPhasing', () => {
  it('updates budget mode, reference year, split mode, and split values', () => {
    const { rerender } = render(<BudgetPhasing />);

    fireEvent.click(screen.getByRole('button', { name: 'optimization.budget.unconstrained' }));
    expect(mockState.updateConfig).toHaveBeenCalledWith({ budgetMode: 'Unconstrained' });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2024' } });
    expect(mockState.updateConfig).toHaveBeenCalledWith({ refYear: 2024 });

    fireEvent.click(screen.getByRole('button', { name: 'actions.customSplit' }));
    expect(mockState.updateConfig).toHaveBeenCalledWith({ qSplitMode: 'custom' });

    // Simulate custom mode for deterministic numeric input handling in this unit test.
    mockState.config.qSplitMode = 'custom';
    rerender(<BudgetPhasing />);
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '30' } });
    expect(mockState.updateConfig).toHaveBeenCalledWith({
      qSplit: { Q1: 30, Q2: 25, Q3: 25, Q4: 25 },
    });
  });

  it('renders forward-looking labels and disables controls by mode', () => {
    mockState.config.mode = 'Forward-looking';
    mockState.config.budgetMode = 'Unconstrained';
    mockState.config.qSplitMode = 'actual';

    render(<BudgetPhasing />);

    expect(screen.getByRole('button', { name: 'optimization.budget.even' })).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeDisabled();
    const quarterInputs = screen.getAllByRole('spinbutton');
    expect(quarterInputs[0]).toBeDisabled();
  });
});