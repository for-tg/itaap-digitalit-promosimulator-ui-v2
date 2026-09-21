import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  updateConfig: vi.fn(),
  allSkus: [
    { sku: 'SKU-1', band: 'LRTB' },
    { sku: 'SKU-2', band: 'MRTB' },
    { sku: 'SKU-3', band: 'HRTB' },
  ],
  config: {
    selectedSkus: [] as string[],
    mode: 'Forward-looking',
    year: 2025,
    planYear: 2026,
    baseYear: 2025,
    period: 'fullYear',
    useTrend: false,
  },
}));

const skuHookState = vi.hoisted(() => ({
  isLoading: false,
  error: null as string | null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: { count?: number; band?: string }) => {
    const map: Record<string, string> = {
      'optimization.skuSelection.title': 'SKU selection',
      'optimization.skuSelection.description': 'Pick SKUs',
      'optimization.skuSelection.selectedSkus': `Selected ${opts?.count ?? 0}`,
      'optimization.skuSelection.addSku': 'Add SKU',
      'optimization.skuSelection.addLrtb': 'Add LRTB',
      'optimization.skuSelection.addMrtb': 'Add MRTB',
      'optimization.skuSelection.addHrtb': 'Add HRTB',
      'actions.clear': 'Clear',
      'filters.all': 'All',
      'optimization.skuSelection.selectSku': 'Select a SKU',
      'optimization.skuSelection.period': 'Period',
      'optimization.skuSelection.fullYear': 'Full year',
      'filters.year': 'Year',
      'optimization.skuSelection.planningYear': 'Planning year',
      'optimization.skuSelection.baseTemplateYear': 'Base year',
      'optimization.skuSelection.applyYoyGrowth': 'Apply YoY growth',
      'optimization.skuSelection.loadingSkus': 'Loading SKUs',
      'optimization.skuSelection.skusAddedRunning': `${opts?.count ?? 0} SKUs added`,
      'optimization.skuSelection.bandSkusAddedRunning': `${opts?.band ?? ''} added`,
      'actions.customSplit': 'Custom split',
      'optimization.skuSelection.removeSku': 'Remove SKU',
    };
    return map[key] ?? key;
  } }),
}));

vi.mock('~/contexts/SimulatorContext', () => ({
  useSimulator: () => mockState,
}));

vi.mock('~/hooks/useSkus', () => ({
  useSkus: () => ({ isLoading: skuHookState.isLoading, error: skuHookState.error }),
}));

import { SkuSelector } from '~/components/Config/SkuSelector';

afterEach(() => {
  cleanup();
  mockState.updateConfig.mockClear();
});

beforeEach(() => {
  mockState.config = {
    selectedSkus: [] as string[],
    mode: 'Forward-looking',
    year: 2025,
    planYear: 2026,
    baseYear: 2025,
    period: 'fullYear',
    useTrend: false,
  };
  mockState.allSkus = [
    { sku: 'SKU-1', band: 'LRTB' },
    { sku: 'SKU-2', band: 'MRTB' },
    { sku: 'SKU-3', band: 'HRTB' },
  ];
  skuHookState.isLoading = false;
  skuHookState.error = null;
});

describe('SkuSelector', () => {
  it('adds, clears, and toggles SKUs', async () => {
    const user = userEvent.setup();

    render(<SkuSelector onFooterAlert={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add LRTB' }));
    expect(mockState.updateConfig).toHaveBeenCalledWith({ selectedSkus: ['SKU-1'] });

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(mockState.updateConfig).toHaveBeenCalledWith({ selectedSkus: [] });

    await user.click(screen.getByRole('button', { name: 'Add SKU' }));
    await user.click(screen.getByRole('button', { name: 'actions.cancel' }));
    expect(screen.queryByText('optimization.skuSelection.selectSkus')).not.toBeInTheDocument();
  });

  it('renders retrospective and forward-looking controls', () => {
    render(<SkuSelector onFooterAlert={vi.fn()} />);
    expect(screen.getByText('Planning year')).toBeInTheDocument();
    expect(screen.getByText('Base year')).toBeInTheDocument();
    expect(screen.getByText('Apply YoY growth')).toBeInTheDocument();
  });

  it('renders loading and error states from useSkus', () => {
    skuHookState.isLoading = true;
    skuHookState.error = 'failed to load';

    render(<SkuSelector onFooterAlert={vi.fn()} />);

    expect(screen.getByText('Loading SKUs')).toBeInTheDocument();
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('selects all SKUs and sends footer alert', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.fn();

    render(<SkuSelector onFooterAlert={alertSpy} />);

    await user.click(screen.getByRole('button', { name: 'All' }));

    expect(mockState.updateConfig).toHaveBeenCalledWith({ selectedSkus: ['SKU-1', 'SKU-2', 'SKU-3'] });
    expect(alertSpy).toHaveBeenCalledWith('3 SKUs added');
  });

  it('handles empty SKU master by treating all as selected', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.fn();
    mockState.allSkus = [];

    render(<SkuSelector onFooterAlert={alertSpy} />);
    await user.click(screen.getByRole('button', { name: 'All' }));

    expect(mockState.updateConfig).toHaveBeenCalledWith({ selectedSkus: [] });
    expect(alertSpy).toHaveBeenCalledWith('0 SKUs added');
  });

  it('adds a band with dedupe and removes selected SKU chip', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.fn();
    mockState.config.selectedSkus = ['SKU-1'];

    render(<SkuSelector onFooterAlert={alertSpy} />);

    await user.click(screen.getByRole('button', { name: 'Add LRTB' }));
    expect(mockState.updateConfig).toHaveBeenCalledWith({ selectedSkus: ['SKU-1'] });
    expect(alertSpy).toHaveBeenCalledWith('LRTB added');

    await user.click(screen.getByRole('button', { name: /SKU-1/i }));
    expect(mockState.updateConfig).toHaveBeenCalledWith({ selectedSkus: [] });
  });

  it('opens SKU modal and commits selected temporary SKUs', async () => {
    const user = userEvent.setup();

    render(<SkuSelector onFooterAlert={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add SKU' }));
    expect(screen.getByText('optimization.skuSelection.selectSkus')).toBeInTheDocument();

    await user.click(screen.getByLabelText('SKU-2'));
    await user.click(screen.getByRole('button', { name: 'optimization.skuSelection.addSelected' }));

    expect(mockState.updateConfig).toHaveBeenCalledWith({ selectedSkus: ['SKU-2'] });
    expect(screen.queryByText('optimization.skuSelection.selectSkus')).not.toBeInTheDocument();
  });

  it('renders retrospective controls and updates year and period', async () => {
    const user = userEvent.setup();
    mockState.config.mode = 'Retrospective';
    mockState.config.period = 'fullYear';

    render(<SkuSelector onFooterAlert={vi.fn()} />);

    await user.selectOptions(screen.getAllByRole('combobox')[0], '2024');
    expect(mockState.updateConfig).toHaveBeenCalledWith({ year: 2024 });

    await user.click(screen.getByRole('button', { name: 'Q1' }));
    expect(mockState.updateConfig).toHaveBeenCalledWith({ period: 'Q1' });
  });

  it('updates forward-looking planning fields', async () => {
    const user = userEvent.setup();

    render(<SkuSelector onFooterAlert={vi.fn()} />);

    const [planningYearSelect, baseYearSelect] = screen.getAllByRole('combobox');

    await user.selectOptions(planningYearSelect, '2024');
    expect(mockState.updateConfig).toHaveBeenCalledWith({ planYear: 2024 });

    await user.selectOptions(baseYearSelect, '2023');
    expect(mockState.updateConfig).toHaveBeenCalledWith({ baseYear: 2023 });

    await user.click(screen.getByLabelText('Apply YoY growth'));
    expect(mockState.updateConfig).toHaveBeenCalledWith({ useTrend: true });
  });
});