import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: { count?: number }) => (key === 'optimization.confirmDialog.runOptimizationBody' ? `Run with ${opts?.count ?? 0}` : key) }),
}));

import { RunConfirmDialog } from '~/components/Config/RunConfirmDialog';

afterEach(cleanup);

describe('RunConfirmDialog', () => {
  it('fires confirm and cancel callbacks', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(<RunConfirmDialog skuCount={18} onConfirm={onConfirm} onCancel={onCancel} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Run with 18')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'actions.cancel' }));
    await user.click(screen.getByRole('button', { name: 'optimization.confirmDialog.runNow' }));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalled();
  });
});