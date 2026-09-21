import { useTranslation } from 'react-i18next';

import { ResultsPanel } from '~/components/Results/ResultsPanel';
import { useSimulator } from '~/contexts/SimulatorContext';
import { exportResultsToExcel } from '~/utils/exportExcel';
import styles from './styles.module.css';

export const OptimizedStage = () => {
  const { results, optimizedTab, setOptimizedTab } = useSimulator();
  const { t } = useTranslation();

  if (!results) {
    return <p className={styles.empty}>{t('optimizedView.shell.noResultsYet')}</p>;
  }

  const tabLabels: Record<typeof optimizedTab, string> = {
    summary: t('tabs.summary'),
    elasticity: t('tabs.elasticity'),
    promoeffectiveness: t('tabs.promoEffectiveness'),
    calendar: t('tabs.calendar'),
    volume: t('tabs.volume'),
  };

  return (
    <div className={styles.stage}>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist">
          {(Object.keys(tabLabels) as Array<typeof optimizedTab>).map((tab) => (
            <button
              key={tab}
              id={`opt-tab-${tab}`}
              role="tab"
              className={`${styles.tab} ${optimizedTab === tab ? styles.activeTab : ''}`}
              onClick={() => setOptimizedTab(tab)}
              aria-selected={optimizedTab === tab}
              aria-controls="opt-tabpanel"
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
        <div className={styles.spacer} />
        <button
          type="button"
          className={styles.downloadBtn}
          onClick={() => exportResultsToExcel(results)}
          title={t('actions.downloadExcel')}
        >
          ⬇ {t('actions.downloadExcel')}
        </button>
      </div>

      <div
        id="opt-tabpanel"
        className={styles.body}
        role="tabpanel"
        aria-labelledby={`opt-tab-${optimizedTab}`}
      >
        <ResultsPanel results={results} />
      </div>
    </div>
  );
};