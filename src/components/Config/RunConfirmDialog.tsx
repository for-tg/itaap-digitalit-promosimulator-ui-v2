import { useTranslation } from 'react-i18next';

import styles from './confirmDialog.module.css';

interface Props {
  skuCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

// Run-optimization confirmation popup shown when SKU count exceeds threshold
export const RunConfirmDialog = ({ skuCount, onConfirm, onCancel }: Props) => {
  const { t } = useTranslation();

  return (
  <div className={styles.confirmOverlay} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
    <div className={styles.confirmDialog}>

      <div className={styles.confirmHeader}>
        <span className={styles.confirmIcon} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 8 12 12" />
            <circle cx="12" cy="16" r="0.5" fill="currentColor" strokeWidth="0" />
          </svg>
        </span>
        <h3 id="confirm-title" className={styles.confirmTitle}>{t('actions.runOptimization')}</h3>
      </div>

      <p className={styles.confirmBody}>
        {t('optimization.confirmDialog.runOptimizationBody', { count: skuCount })}
      </p>
      <span className={styles.confirmSub}>
        {t('optimization.confirmDialog.runOptimizationSubtitle')}
      </span>

      <div className={styles.confirmActions}>
        <button type="button" className={styles.confirmCancel} onClick={onCancel}>
          {t('actions.cancel')}
        </button>
        <button type="button" className={styles.confirmPrimary} onClick={onConfirm}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          {t('optimization.confirmDialog.runNow')}
        </button>
      </div>

    </div>
  </div>
  );
};
