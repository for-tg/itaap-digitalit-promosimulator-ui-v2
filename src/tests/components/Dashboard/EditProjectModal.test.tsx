import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '~/types/project';

const mocks = vi.hoisted(() => ({
  updateProject: vi.fn(),
  onClose: vi.fn(),
}));

vi.mock('~/contexts/ProjectsContext', () => ({
  useProjects: () => ({
    updateProject: mocks.updateProject,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { EditProjectModal } from '~/components/Dashboard/EditProjectModal';

const project: Project = {
  id: 'project-1',
  name: 'Old Name',
  market: 'CZ',
  mag: 'RTB',
  retailer: 'All',
  description: 'Old Desc',
  createdOn: '27 Aug 2026',
  updatedOn: '27 Aug 2026',
  deleted: false,
  scenarios: [],
};

describe('EditProjectModal', () => {
  beforeEach(() => {
    mocks.updateProject.mockReset();
    mocks.onClose.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('saves updated fields and trims name', async () => {
    mocks.updateProject.mockResolvedValue(undefined);

    render(<EditProjectModal project={project} onClose={mocks.onClose} />);

    const nameInput = screen.getByLabelText(/home\.createProjectModal\.projectName/);
    fireEvent.change(nameInput, { target: { value: '  New Name  ' } });

    const descriptionInput = screen.getByLabelText(/home\.createProjectModal\.description/);
    fireEvent.change(descriptionInput, { target: { value: 'New Description' } });

    fireEvent.click(screen.getByRole('button', { name: 'actions.saveChanges' }));

    await waitFor(() => {
      expect(mocks.updateProject).toHaveBeenCalledWith(
        'project-1',
        'New Name',
        'New Description',
      );
    });

    expect(mocks.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows submit errors for both Error and non-Error failures', async () => {
    mocks.updateProject.mockRejectedValueOnce(new Error('boom'));
    render(<EditProjectModal project={project} onClose={mocks.onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'actions.saveChanges' }));
    expect(await screen.findByText('boom')).toBeInTheDocument();

    mocks.updateProject.mockRejectedValueOnce('x');
    fireEvent.click(screen.getByRole('button', { name: 'actions.saveChanges' }));
    expect(await screen.findByText('errors.updateProjectFailed')).toBeInTheDocument();

    expect(mocks.onClose).not.toHaveBeenCalled();
  });

  it('disables save for empty name and handles close controls', async () => {
    render(<EditProjectModal project={project} onClose={mocks.onClose} />);

    const nameInput = screen.getByLabelText(/home\.createProjectModal\.projectName/);
    fireEvent.change(nameInput, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'actions.saveChanges' })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'actions.cancel' }));
    fireEvent.click(screen.getByLabelText('actions.close'));
    fireEvent.click(screen.getByRole('dialog'));

    expect(mocks.onClose).toHaveBeenCalledTimes(3);
  });

  it('shows saving state while submit is pending', async () => {
    let resolveUpdate: (() => void) | undefined;
    mocks.updateProject.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    render(<EditProjectModal project={project} onClose={mocks.onClose} />);

    fireEvent.change(screen.getByLabelText(/home\.createProjectModal\.projectName/), {
      target: { value: 'New Name' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'actions.saveChanges' }));

    expect(screen.getByRole('button', { name: 'actions.saving' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'actions.cancel' })).toBeDisabled();

    resolveUpdate?.();

    await waitFor(() => {
      expect(mocks.onClose).toHaveBeenCalledTimes(1);
    });
  });
});
