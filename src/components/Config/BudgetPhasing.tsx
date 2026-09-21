import { useTranslation } from 'react-i18next';

import { ANALYSIS_YEARS } from '~/constants/simulator';
import { useSimulator } from '~/contexts/SimulatorContext';
import styles from '~/screens/SimulatorScreen/stages/ConfigStage/styles.module.css';

// Compute Q1-Q4 proportions from historical weekly spend data.
function computeLastYearSplit(weekly: Record<string, { week: number; spend: number }[]>) {
  const spend = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  const weekToQ = (w: number): 'Q1' | 'Q2' | 'Q3' | 'Q4' =>
    w <= 13 ? 'Q1' : w <= 26 ? 'Q2' : w <= 39 ? 'Q3' : 'Q4';
  Object.values(weekly).forEach((rows) =>
    rows.forEach((r) => { if (r.spend > 0) spend[weekToQ(r.week)] += r.spend; })
  );
  const total = Object.values(spend).reduce((s, v) => s + v, 0);
  if (total === 0) return { Q1: 25, Q2: 25, Q3: 25, Q4: 25 };
  // Round to whole %s; put any remainder in Q4
  const raw = Object.fromEntries(
    Object.entries(spend).map(([q, v]) => [q, Math.floor(v / total * 100)])
  ) as { Q1: number; Q2: number; Q3: number; Q4: number };
  const remainder = 100 - Object.values(raw).reduce((s, v) => s + v, 0);
  raw.Q4 += remainder;
  return raw;
}

// Promo budget and quarterly phasing configuration panel
export const BudgetPhasing = () => {
  const { config, updateConfig, historicalSummary } = useSimulator();
  const { t } = useTranslation();
  // — Quarterly split handler —
  const handleQSplit = (q: 'Q1' | 'Q2' | 'Q3' | 'Q4', v: number) => {
    updateConfig({ qSplit: { ...config.qSplit, [q]: v } });
  };

  const selectMatchLastYear = () => {
    const weekly = historicalSummary?.weekly;
    if (weekly && Object.keys(weekly).length > 0) {
      // Historical data loaded — compute real proportions and lock them
      const split = computeLastYearSplit(
        weekly as Record<string, { week: number; spend: number }[]>
      );
      updateConfig({ qSplit: split, qSplitMode: 'actual' });
    } else {
      // No historical data yet — just lock the current values as-is
      updateConfig({ qSplitMode: 'actual' });
    }
  };

  const selectCustomSplit = () => {
    // Always reset to even 25/25/25/25 when switching to Custom
    updateConfig({ qSplitMode: 'custom', qSplit: { Q1: 25, Q2: 25, Q3: 25, Q4: 25 } });
  };

  return (
    <section className={styles.cell}>
      <h3 className={styles.sectionTitle}>{t('optimization.budget.title')}</h3>

      {/* — Budget mode and reference year — */}
      <div className={styles.fieldRow}>
        <div className={styles.fieldBlock}>
          <label className={styles.groupLabel}>
            {t('optimization.budget.budgetMode')}
          </label>
          <div className={styles.segment} role="group" aria-label={t('optimization.budget.budgetMode')}>
            <button
              type="button"
              className={
                config.budgetMode === 'Constrained' ? styles.segmentActive : ''
              }
              onClick={() => updateConfig({ budgetMode: 'Constrained' })}
            >
              {t('optimization.budget.constrained')}
            </button>
            <button
              type="button"
              className={
                config.budgetMode === 'Unconstrained'
                  ? styles.segmentActive
                  : ''
              }
              onClick={() => updateConfig({ budgetMode: 'Unconstrained' })}
            >
              {t('optimization.budget.unconstrained')}
            </button>
          </div>
        </div>

        <div className={`${styles.fieldBlock} ${styles.compactFieldBlock}`}>
          <label className={styles.groupLabel}>
            {t('optimization.budget.referenceYear')}
          </label>
          <select
            className={`${styles.wideSelect} ${styles.compactSelect}`}
            value={config.refYear}
            onChange={(e) => updateConfig({ refYear: Number(e.target.value) })}
          >
            {ANALYSIS_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* — Budget multiplier slider — */}
      <div className={styles.sliderBlock}>
        <div className={styles.sliderMeta}>
          {t('optimization.budget.budgetVsHistorical')}
        </div>
        <div className={styles.sliderValue}>
          {(config.budgetMult / 100).toFixed(2)}x
        </div>
        <input
          type="range"
          className="range"
          min={50}
          max={200}
          value={config.budgetMult}
          disabled={config.budgetMode === 'Unconstrained'}
          onChange={(e) => updateConfig({ budgetMult: Number(e.target.value) })}
        />
      </div>

      {/* — Quarterly allocation — */}
      <div className={styles.rowWrapCompact}>
        <label className={styles.groupLabel}>
          {t('optimization.budget.quarterlyAllocation')}
        </label>
        <div
          className={styles.segment}
          role="group"
          aria-label={t('optimization.budget.qAllocationMode')}
        >
          {/* "Even / Match actual" only makes sense in Retrospective mode */}
          {config.mode === 'Retrospective' && (
            <button
              type="button"
              className={
                config.qSplitMode === 'actual' ? styles.segmentActive : ''
              }
              onClick={() => updateConfig({ qSplitMode: 'actual' })}
            >
              {t('actions.matchActual')}
            </button>
          )}
          {config.mode === 'Forward-looking' && (
            <button
              type="button"
              className={config.qSplitMode === 'actual' ? styles.segmentActive : ''}
              onClick={selectMatchLastYear}
              title={t('optimization.budget.matchLastYearTooltip')}
            >
              {t('optimization.budget.matchLastYear')}
            </button>
          )}
          <button
            type="button"
            className={config.qSplitMode === 'custom' ? styles.segmentActive : ''}
            onClick={selectCustomSplit}
          >
            {t('actions.customSplit')}
          </button>
        </div>
      </div>

      <div className={styles.qGrid}>
        {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
          <label key={q} className={styles.qBox}>
            <span>{q}</span>
            <input
              type="number"
              min={0}
              max={100}
              value={config.qSplit[q]}
              disabled={config.qSplitMode !== 'custom'}
              onChange={(e) => handleQSplit(q, Number(e.target.value))}
            />
          </label>
        ))}
      </div>
    </section>
  );
};
