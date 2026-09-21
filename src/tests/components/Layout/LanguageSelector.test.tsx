import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../i18n/i18n', () => ({
  DEFAULT_LANGUAGE_CODE: 'en',
  LANGUAGES: [
    { code: 'en', label: 'English', flag: '🌐' },
    { code: 'zh-CN', label: 'Chinese', flag: '🇨🇳' },
  ],
  getStoredLanguage: () => 'en',
  translatePage: vi.fn().mockResolvedValue(undefined),
}));

import { LanguageSelector } from '~/components/Layout/LanguageSelector';
import { translatePage } from '../../../i18n/i18n';

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('LanguageSelector', () => {
  it('opens the language list and allows selecting a language', async () => {
    const user = userEvent.setup();

    render(<LanguageSelector />);

    await user.click(screen.getByRole('button', { name: 'languageSelector.selectedLanguage' }));
    expect(screen.getByRole('listbox', { name: 'filters.language' })).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: /Chinese/i }));
    expect(translatePage).toHaveBeenCalledWith('zh-CN');
  });

  it('filters the list by search input', async () => {
    const user = userEvent.setup();

    render(<LanguageSelector />);

    await user.click(screen.getByRole('button', { name: 'languageSelector.selectedLanguage' }));
    await user.type(screen.getByRole('textbox', { name: 'languageSelector.searchLanguages' }), 'zh');

    expect(screen.getByRole('option', { name: /Chinese/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /English/i })).not.toBeInTheDocument();
  });

  it('shows empty-search state and closes on escape and outside click', async () => {
    const user = userEvent.setup();

    render(<LanguageSelector />);

    await user.click(screen.getByRole('button', { name: 'languageSelector.selectedLanguage' }));
    await user.type(screen.getByRole('textbox', { name: 'languageSelector.searchLanguages' }), 'zzz');
    expect(screen.getByText('languageSelector.noLanguagesFound')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox', { name: 'filters.language' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'languageSelector.selectedLanguage' }));
    expect(screen.getByRole('listbox', { name: 'filters.language' })).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByRole('listbox', { name: 'filters.language' })).not.toBeInTheDocument();
  });
});
