import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createProject: vi.fn(),
  onClose: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('~/contexts/ProjectsContext', () => ({
  useProjects: () => ({
    createProject: mocks.createProject,
  }),
}));

import { CreateProjectModal } from '~/components/Dashboard/CreateProjectModal';

describe('CreateProjectModal', () => {
  beforeEach(() => {
    mocks.createProject.mockReset();
    mocks.onClose.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('creates project for enabled market with auto MAG/retailer', async () => {
    mocks.createProject.mockResolvedValue(undefined);

    render(<CreateProjectModal onClose={mocks.onClose} />);

    const createButton = screen.getByRole('button', {
      name: 'home.createProjectModal.createProject',
    });
    expect(createButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/home.createProjectModal.projectName/i), {
      target: { value: '  Demo Project  ' },
    });
    fireEvent.change(screen.getByLabelText(/filters.market/i), {
      target: { value: 'CZ' },
    });
    fireEvent.change(screen.getByLabelText(/home.createProjectModal.description/i), {
      target: { value: 'My description' },
    });

    expect(screen.getByLabelText(/filters\.mag/i)).toHaveValue('RTB');
    expect(screen.getByLabelText(/filters.retailer/i)).toHaveValue('All');

    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mocks.createProject).toHaveBeenCalledWith({
        name: 'Demo Project',
        market: 'CZ',
        mag: 'RTB',
        retailer: 'All',
        description: 'My description',
      });
    });

    expect(mocks.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows disabled coming-soon market options and handles submit failure', async () => {
    mocks.createProject.mockRejectedValue(new Error('request failed'));

    render(<CreateProjectModal onClose={mocks.onClose} />);

    const marketSelect = screen.getByLabelText(/filters.market/i);
    const usOption = screen.getByRole('option', {
      name: /US \(home.createProjectModal.comingSoon\)/i,
    });
    expect(usOption).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/home.createProjectModal.projectName/i), {
      target: { value: 'Demo' },
    });
    fireEvent.change(marketSelect, { target: { value: 'CZ' } });
    fireEvent.click(screen.getByRole('button', { name: 'home.createProjectModal.createProject' }));

    await waitFor(() => {
      expect(mocks.createProject).toHaveBeenCalledTimes(1);
    });

    expect(mocks.onClose).not.toHaveBeenCalled();
  });

  it('closes from overlay and close button', async () => {
    render(<CreateProjectModal onClose={mocks.onClose} />);

    fireEvent.click(screen.getByLabelText(/home.createProjectModal.close/i));
    expect(mocks.onClose).toHaveBeenCalledTimes(1);

    cleanup();
    render(<CreateProjectModal onClose={mocks.onClose} />);
    fireEvent.click(screen.getByRole('dialog'));

    expect(mocks.onClose).toHaveBeenCalledTimes(2);
  });

  it('handles multi-retailer MAG path and does not close when clicking inside modal content', () => {
    render(<CreateProjectModal onClose={mocks.onClose} />);

    fireEvent.change(screen.getByLabelText(/home.createProjectModal.projectName/i), {
      target: { value: 'US project' },
    });
    fireEvent.change(screen.getByLabelText(/filters.market/i), {
      target: { value: 'US' },
    });
    fireEvent.change(screen.getByLabelText(/filters\.mag/i), {
      target: { value: '' },
    });

    // Clearing MAG should clear retailer auto-selection.
    expect(screen.getByLabelText(/filters.retailer/i)).toHaveValue('home.createProjectModal.selectMagFirst');
    expect(screen.getByRole('button', { name: 'home.createProjectModal.createProject' })).toBeDisabled();

    fireEvent.click(screen.getByText('home.createNewProject'));
    expect(mocks.onClose).not.toHaveBeenCalled();
  });
});
