import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DEFAULT_LANGUAGE_CODE,
  LANGUAGES,
  getStoredLanguage,
  translatePage,
  type Language,
} from '../../../i18n/i18n';
import styles from './styles.module.css';

export const LanguageSelector = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCode, setSelectedCode] = useState<string>(getStoredLanguage);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected: Language =
    LANGUAGES.find((l) => l.code === selectedCode) ??
    LANGUAGES.find((l) => l.code === DEFAULT_LANGUAGE_CODE)!;

  const filtered = LANGUAGES.filter(
    (l) =>
      l.label.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase())
  );

  // Focus search input whenever the dropdown opens.
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open]);

  // Close on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape key.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = useCallback((lang: Language) => {
    setSelectedCode(lang.code);
    setOpen(false);

    // ── Translation API is called here via translatePage() ──
    // To connect your API, edit src/components/Layout/LanguageSelector/i18n.ts
    void translatePage(lang.code);
  }, []);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {/* Trigger button */}
      <button
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('languageSelector.selectedLanguage', { language: selected.label })}
        title={t('languageSelector.selectLanguage')}
      >
        <span className={styles.globe}>{selected.flag}</span>
        <span className={styles.selectedLabel}>{selected.label}</span>
        <span className={`${styles.caret} ${open ? styles.caretOpen : ''}`}>
          ▼
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className={styles.dropdown} role="listbox" aria-label={t('filters.language')}>
          {/* Search box */}
          <div className={styles.searchWrap}>
            <div className={styles.searchInputWrapper}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                ref={searchRef}
                className={styles.searchInput}
                type="text"
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t('languageSelector.searchLanguages')}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Language list */}
          <div className={styles.list}>
            {filtered.length === 0 ? (
              <p className={styles.empty}>{t('languageSelector.noLanguagesFound')}</p>
            ) : (
              filtered.map((lang) => {
                const isActive = lang.code === selectedCode;
                return (
                  <button
                    key={lang.code}
                    className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(lang)}
                  >
                    <span className={styles.flag}>{lang.flag}</span>
                    <span>{lang.label}</span>
                    <span className={styles.itemCode}>
                      {lang.code.toUpperCase()}
                    </span>
                    {isActive && <span className={styles.checkmark}>✓</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
