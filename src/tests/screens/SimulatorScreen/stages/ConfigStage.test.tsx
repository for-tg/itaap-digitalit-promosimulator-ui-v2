import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  config: {
    mode: 'Forward-looking',
    blend: 50,
    selectedSkus: [] as string[],
    maxDiscount: 20,
    marginFloor: 10,
    marginFloorOn: true,
    useTrend: false,
    budgetMode: 'Constrained',
    budgetMult: 100,
    qSplitMode: 'actual',
    qSplit: { Q1: 25, Q2: 25, Q3: 25, Q4: 25 },
    refYear: 2025,
    planYear: 2026,
    baseYear: 2025,
    period: 'fullYear',
  },
  allSkus: [
    { sku: 'SKU-1', band: 'LRTB' },
    { sku: 'SKU-2', band: 'MRTB' },
    { sku: 'SKU-3', band: 'HRTB' },
  ],
  updateConfig: vi.fn(),
  advanceTo: vi.fn(),
  resetConfig: vi.fn(),
  run: vi.fn(),
  isRunning: false,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: { count?: number }) => {
    const map: Record<string, string> = {
      'optimization.configurePromotionScenario': 'Configure',
      'optimization.retrospectiveDescription': 'Retro desc',
      'optimization.forwardLookingDescription': 'Forward desc',
      'optimization.analysisType': 'Analysis type',
      'optimization.retrospective': 'Retrospective',
      'optimization.forwardLooking': 'Forward-looking',
      'optimization.objective.title': 'Objective',
      'optimization.objective.description': 'Objective desc',
      'optimization.objective.optimizationPreset': 'Objective preset',
      'metrics.profit': 'Profit',
      'optimization.objective.balanced': 'Balanced',
      'metrics.revenue': 'Revenue',
      'optimization.objective.profitRevenueBlend': 'Blend',
      'optimization.objective.profitPercentage': `${opts?.count ?? 0}%`,
      'optimization.objective.calendarImpact': 'Calendar impact',
      'optimization.guardrails.title': 'Guardrails',
      'optimization.guardrails.maxDiscountDepth': 'Max discount',
      'optimization.guardrails.marginFloor': 'Margin floor',
      'optimization.guardrails.enforceMinimumMargin': 'Enforce margin',
      'optimization.skuSelection.title': 'SKU selection',
      'optimization.skuSelection.description': 'Select SKUs',
      'optimization.budget.title': 'Budget',
      'messages.skusSelected': `${opts?.count ?? 0} selected`,
      'actions.runOptimization': 'Run optimization',
      'actions.cancel': 'Cancel',
      'optimization.confirmDialog.runNow': 'Run now',
      'optimization.confirmDialog.runOptimizationBody': `Run ${opts?.count ?? 0}`,
      'optimization.confirmDialog.runOptimizationSubtitle': 'Confirm',
      'actions.matchActual': 'Match actual',
      'actions.customSplit': 'Custom split',
      'filters.year': 'Year',
      'optimization.skuSelection.selectedSkus': `Selected ${opts?.count ?? 0}`,
      'optimization.skuSelection.addSku': 'Add SKU',
      'optimization.skuSelection.addLrtb': 'Add LRTB',
      'optimization.skuSelection.addMrtb': 'Add MRTB',
      'optimization.skuSelection.addHrtb': 'Add HRTB',
      'actions.clear': 'Clear',
      'filters.all': 'All',
      'optimization.skuSelection.period': 'Period',
      'optimization.skuSelection.fullYear': 'Full year',
      'optimization.skuSelection.planningYear': 'Planning year',
      'optimization.skuSelection.baseTemplateYear': 'Base year',
      'optimization.skuSelection.applyYoyGrowth': 'Apply YoY growth',
      'optimization.budget.budgetMode': 'Budget mode',
      'optimization.budget.constrained': 'Constrained',
      'optimization.budget.unconstrained': 'Unconstrained',
      'optimization.budget.referenceYear': 'Reference year',
      'optimization.budget.budgetVsHistorical': 'Budget vs historical',
      'optimization.budget.quarterlyAllocation': 'Quarterly allocation',
      'optimization.budget.even': 'Even',
    };
    return map[key] ?? key;
  } }),
}));

vi.mock('~/contexts/SimulatorContext', () => ({
  useSimulator: () => mockState,
}));

vi.mock('~/hooks/useRunSimulation', () => ({
  useRunSimulation: () => ({ isRunning: mockState.isRunning, run: mockState.run }),
}));

vi.mock('~/hooks/useSkus', () => ({
  useSkus: () => ({ isLoading: false, error: null }),
}));

vi.mock('~/components/Config/SkuSelector', () => ({
  SkuSelector: ({ onFooterAlert }: { onFooterAlert: (msg: string | null) => void }) => (
    <button onClick={() => onFooterAlert('alert from sku')}>Emit alert</button>
  ),
}));

import { ConfigStage } from '~/screens/SimulatorScreen/stages/ConfigStage';

afterEach(() => {
  cleanup();
  mockState.updateConfig.mockClear();
  mockState.advanceTo.mockClear();
  mockState.resetConfig.mockClear();
  mockState.run.mockClear();
});

describe('ConfigStage', () => {
  it('updates objective and guardrail controls', async () => {
    render(<ConfigStage />);

    fireEvent.click(screen.getByRole('button', { name: 'Revenue' }));
    expect(mockState.updateConfig).toHaveBeenCalledWith({ blend: 0 });

    fireEvent.click(screen.getByRole('button', { name: 'Retrospective' }));
    expect(mockState.updateConfig).toHaveBeenCalledWith({ mode: 'Retrospective' });

    fireEvent.click(screen.getByRole('button', { name: 'Constrained' }));
    expect(mockState.updateConfig).toHaveBeenCalledWith({ budgetMode: 'Constrained' });

    fireEvent.click(screen.getByRole('button', { name: 'actions.reset' }));
    expect(mockState.resetConfig).toHaveBeenCalled();
  });

  it('opens confirm dialog for large SKU selections and runs optimization', async () => {
    const user = userEvent.setup();
    mockState.config.selectedSkus = Array.from({ length: 16 }, (_, i) => `SKU-${i + 1}`);

    render(<ConfigStage />);

    await user.click(screen.getByRole('button', { name: /run optimization/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Run now' }));
    expect(mockState.run).toHaveBeenCalled();
    expect(mockState.advanceTo).toHaveBeenCalledWith('optimized');
  });

  it('covers objective presets and guardrail controls', async () => {
    const user = userEvent.setup();
    mockState.config.selectedSkus = ['SKU-1'];

    render(<ConfigStage />);

    await user.click(screen.getByRole('button', { name: 'Profit' }));
    expect(mockState.updateConfig).toHaveBeenCalledWith({ blend: 100 });

    await user.click(screen.getByRole('button', { name: 'Balanced' }));
    expect(mockState.updateConfig).toHaveBeenCalledWith({ blend: 50 });

    const ranges = screen.getAllByRole('slider');
    await user.click(ranges[0]);
    expect(mockState.updateConfig).toHaveBeenCalled();

    await user.click(screen.getByLabelText('Enforce margin'));
    expect(mockState.updateConfig).toHaveBeenCalledWith({ marginFloorOn: false });
  });

  it('runs directly for small selection and does not advance on run error', async () => {
    const user = userEvent.setup();
    mockState.config.selectedSkus = ['SKU-1', 'SKU-2'];
    mockState.run.mockResolvedValueOnce('failed');

    render(<ConfigStage />);

    await user.click(screen.getByRole('button', { name: /run optimization/i }));
    expect(mockState.run).toHaveBeenCalled();
    expect(mockState.advanceTo).not.toHaveBeenCalledWith('optimized');
  });

  it('renders retrospective description when mode is retrospective', () => {
    mockState.config.mode = 'Retrospective';
    mockState.config.selectedSkus = ['SKU-1'];

    render(<ConfigStage />);

    expect(screen.getByText('Retro desc')).toBeInTheDocument();
  });

  it('shows footer alert from sku selector callback', async () => {
    const user = userEvent.setup();
    mockState.config.selectedSkus = ['SKU-1'];

    render(<ConfigStage />);

    await user.click(screen.getByRole('button', { name: 'Emit alert' }));
    expect(screen.getByText('alert from sku')).toBeInTheDocument();
  });
});