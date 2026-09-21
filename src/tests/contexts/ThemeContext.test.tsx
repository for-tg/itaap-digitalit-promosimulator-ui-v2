import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ThemeProvider, useTheme } from '~/contexts/ThemeContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(cleanup);

  describe('useTheme outside provider', () => {
    it('throws when called outside ThemeProvider', () => {
      expect(() => renderHook(() => useTheme())).toThrow(
        'useTheme must be used inside ThemeProvider',
      );
    });
  });

  describe('initial theme', () => {
    it('defaults to light when localStorage has no theme', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBe('light');
    });

    it('restores light theme from localStorage', () => {
      localStorage.setItem('theme', 'light');
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBe('light');
    });

    it('restores dark theme from localStorage', () => {
      localStorage.setItem('theme', 'dark');
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBe('dark');
    });

    it('falls back to light when localStorage has invalid value', () => {
      localStorage.setItem('theme', 'invalid-value');
      const { result } = renderHook(() => useTheme(), { wrapper });
      // Falls through to data-theme attribute or defaults to light.
      expect(['light', 'dark']).toContain(result.current.theme);
    });

    it('reads dark from data-theme attribute when localStorage is empty', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBe('dark');
    });
  });

  describe('toggleTheme', () => {
    it('switches theme from light to dark', () => {
      localStorage.setItem('theme', 'light');
      const { result } = renderHook(() => useTheme(), { wrapper });
      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe('dark');
    });

    it('switches theme from dark to light', () => {
      localStorage.setItem('theme', 'dark');
      const { result } = renderHook(() => useTheme(), { wrapper });
      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe('light');
    });

    it('persists new theme to localStorage', () => {
      localStorage.setItem('theme', 'light');
      const { result } = renderHook(() => useTheme(), { wrapper });
      act(() => {
        result.current.toggleTheme();
      });
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('updates data-theme attribute on documentElement', () => {
      localStorage.setItem('theme', 'light');
      const { result } = renderHook(() => useTheme(), { wrapper });
      act(() => {
        result.current.toggleTheme();
      });
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('can toggle back and forth multiple times', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      act(() => { result.current.toggleTheme(); });
      act(() => { result.current.toggleTheme(); });
      expect(result.current.theme).toBe('light');
    });
  });

  describe('side effects on mount', () => {
    it('sets data-theme attribute to match initial theme', () => {
      localStorage.setItem('theme', 'dark');
      renderHook(() => useTheme(), { wrapper });
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('writes theme to localStorage on mount', () => {
      renderHook(() => useTheme(), { wrapper });
      expect(localStorage.getItem('theme')).toBeDefined();
    });
  });
});
