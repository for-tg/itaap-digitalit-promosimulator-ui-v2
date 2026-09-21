import { useTranslation } from 'react-i18next';

import { useSimulator } from '~/contexts/SimulatorContext';
import { useHistorical } from '~/hooks/useHistorical';
import { ANALYSIS_YEARS } from '~/constants/simulator';
import { HistoricalHeatmap } from '~/components/Historical/HistoricalHeatmap';
import { UnitsAspChart } from '~/components/Historical/UnitsAspChart';
import styles from './styles.module.css';

export const HistoricalStage = () => {
  const {
    histYear, setHistYear,
    historicalTab, setHistoricalTab,
    advanceTo,
    historicalSummary,
    economics,
  } = useSimulator();

  const { data, isLoading, error } = useHistorical(histYear, economics);
  const currencySymbol = data?.currency?.symbol ?? '';
  const { t } = useTranslation();

  const portfolioRows = data?.portfolio ?? [];
  const totalSkuCount = data?.n_skus_total ?? historicalSummary?.n_skus_total ?? 0;

  return (
    <div className={styles.stage}>
      <div className={styles.content}>
        {/* Tab bar */}
        <div className={styles.tabsRow} role="tablist">
          {(['effectiveness', 'unitsasp'] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              className={`${styles.tab} ${historicalTab === tab ? styles.activeTab : ''}`}
              onClick={() => setHistoricalTab(tab)}
              aria-selected={historicalTab === tab}
            >
              {tab === 'effectiveness'
                ? t('charts.promoEffectivenessHeatmap')
                : t('charts.unitsVsAsp')}
            </button>
          ))}
        </div>

        {isLoading && <p className="loading">{t('common.loadingHistoricalData')}&hellip;</p>}
        {error && <p className="error-msg">{error}</p>}

        {data && (
          <>
            {/* ── Promo Effectiveness heat map ── */}
            {historicalTab === 'effectiveness' && (
              <div className={styles.panel}>
                <div className={styles.chartHeader}>
                  <div>
                    <div className={styles.chartTitle}>{t('charts.promoEffectivenessHeatmap')}</div>
                    <div className={styles.chartSubtitle}>
                      {t('charts.showingSkusByHistoricalSpend', {
                        shown: portfolioRows.length,
                        total: totalSkuCount,
                        year: histYear,
                      })}
                    </div>
                  </div>
                  <div className={styles.controls}>
                    <select className={styles.select} value={histYear}
                      onChange={(e) => setHistYear(Number(e.target.value))} aria-label={t('filters.year')}>
                      {ANALYSIS_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                </div>
                <HistoricalHeatmap
                  rows={portfolioRows}
                  weekly={data.weekly}
                  currencySymbol={currencySymbol}
                  metric="effectiveness"
                />
                <p className={styles.note}>{t('charts.effectivenessHeatmapFootnote')}</p>
              </div>
            )}

            {/* ── Units vs ASP chart ── */}
            {historicalTab === 'unitsasp' && (
              <div className={styles.panel}>
                <div className={styles.chartHeader}>
                  <div>
                    <div className={styles.chartTitle}>{t('charts.unitsVsAsp')}</div>
                    <div className={styles.chartSubtitle}>
                      {t('charts.unitsVsAspSubtitle', { year: histYear })}
                    </div>
                  </div>
                  <div className={styles.controls}>
                    <select className={styles.select} value={histYear}
                      onChange={(e) => setHistYear(Number(e.target.value))} aria-label={t('filters.year')}>
                      {ANALYSIS_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                </div>
                <UnitsAspChart
                  rows={portfolioRows}
                  weekly={data.weekly}
                  year={histYear}
                  currencySymbol={currencySymbol}
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.footer}>
        <p className={styles.footerText}>{t('messages.reviewHistoricalPicture')}</p>
        <button className={styles.continueBtn} onClick={() => advanceTo('config')} disabled={isLoading}>
          {t('actions.continueToConfiguration')} &rarr;
        </button>
      </div>
    </div>
  );
};
