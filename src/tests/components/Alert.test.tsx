import { buttonVariant } from '@filament/react/styles';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { expect, describe, it, afterEach, beforeEach, vi } from 'vitest';

import { Alert } from '~/components/Alert';

const renderAlert = (
  isVisible = true,
  onOkayPress = () => {},
  onCancelPress?: () => void
) =>
  render(
    <Alert
      title="Title"
      message="Message"
      isVisible={isVisible}
      positiveButtonTitle="Okay"
      onPositiveButtonPress={onOkayPress}
      negativeButtonTitle={onCancelPress ? 'Cancel' : undefined}
      onNegativeButtonPress={onCancelPress}
    />
  );

describe('Alert component', () => {
  afterEach(cleanup);

  it('should render with "Title"', () => {
    renderAlert();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('should render with "Message"', () => {
    renderAlert();
    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  it('should not show the dialog when "isVisible" prop is set to "false"', () => {
    renderAlert(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('when "Okay" button is visible', () => {
    const onOkayPress = vi.fn();
    beforeEach(() => {
      renderAlert(true, onOkayPress);
    });

    afterEach(() => {
      cleanup();
      onOkayPress.mockClear();
    });

    it('should render "Okay" button in the correct variant', () => {
      expect(screen.getByText('Okay')).toBeInTheDocument();
      expect(screen.getByText('Okay')).toHaveClass(buttonVariant.primary);
    });

    it('should invoke callback handler on "Okay" button press', async () => {
      await userEvent.click(screen.getByText('Okay'));
      expect(onOkayPress).toBeCalled();
    });
  });

  describe('when both "Okay" and "Cancel" buttons are visible', () => {
    const onOkayPress = vi.fn();
    const onCancelPress = vi.fn();
    beforeEach(() => {
      renderAlert(true, onOkayPress, onCancelPress);
    });

    afterEach(() => {
      cleanup();
      onOkayPress.mockClear();
      onCancelPress.mockClear();
    });

    it('should render "Okay" and "Cancel" buttons in the correct variant', () => {
      expect(screen.getByText('Okay')).toBeInTheDocument();
      expect(screen.getByText('Okay')).toHaveClass(buttonVariant.primary);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toHaveClass(buttonVariant.quiet);
    });

    it('should invoke callback handler on "Okay" button press', async () => {
      await userEvent.click(screen.getByText('Okay'));
      expect(onOkayPress).toBeCalled();
    });

    it('should invoke callback handler on "Cancel" button press', async () => {
      await userEvent.click(screen.getByText('Cancel'));
      expect(onCancelPress).toBeCalled();
    });
  });
});
