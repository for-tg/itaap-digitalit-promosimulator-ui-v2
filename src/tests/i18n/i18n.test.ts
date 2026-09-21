import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('i18n helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports a working i18n instance from i18n/index', async () => {
    const { default: i18n } = await import('~/i18n/index');
    expect(i18n).toBeDefined();
    expect(typeof i18n.changeLanguage).toBe('function');
  });

  it('returns stored language from localStorage when available', async () => {
    localStorage.setItem('app_language', 'zh-CN');
    const { getStoredLanguage } = await import('~/i18n/i18n');

    expect(getStoredLanguage()).toBe('zh-CN');
  });

  it('returns default language when localStorage read fails', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('read-failed');
    });

    const { DEFAULT_LANGUAGE_CODE, getStoredLanguage } = await import('~/i18n/i18n');
    expect(getStoredLanguage()).toBe(DEFAULT_LANGUAGE_CODE);
  });

  it('translatePage updates localStorage and html lang attribute', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { translatePage } = await import('~/i18n/i18n');

    await translatePage('zh-CN');

    expect(localStorage.getItem('app_language')).toBe('zh-CN');
    expect(document.documentElement.getAttribute('lang')).toBe('zh-CN');
    expect(infoSpy).toHaveBeenCalled();
  });

  it('translatePage still resolves when localStorage write fails', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('write-failed');
    });
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { translatePage } = await import('~/i18n/i18n');

    await expect(translatePage('en')).resolves.toBeUndefined();
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });
});
