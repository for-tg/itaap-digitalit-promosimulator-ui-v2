import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useSimulator } from '~/contexts/SimulatorContext';
import { useRailCards, useHistoricalRailCards } from '~/hooks/useFormatters';
import styles from './styles.module.css';

/**
 * Left rail sidebar — shows stage-specific KPI cards.
 * Historical stage: portfolio totals from the loaded summary.
 * Optimized stage: recommended vs actual metrics.
 */
export const RailSidebar = memo(() => {
  const { t: translate } = useTranslation();

  const {
    stage,
    historicalSummary,
    allSkus,
    config,
    economics,
    setEconomics,
  } = useSimulator();

  const railCards = useRailCards();
  const histCards = useHistoricalRailCards();

  const tots = historicalSummary?.totals;

  // Single card template used by all three stages
  const emptyCards = (
    ['metrics.revenue', 'metrics.igm', 'metrics.igmMargin',
     'metrics.incrementalLift', 'metrics.promoEffectiveness'] as const
  ).map((key) => ({ label: translate(key), value: '—', delta: '', direction: 'flat' as const }));

  const isHistorical = stage === 'historical' || stage === 'config';
  const modeTitle = isHistorical
    ? translate('rail.modeHistorical')
    : config.mode === 'Retrospective'
    ? translate('rail.modeOptimalRetro')
    : translate('rail.modeOptimalPlan');

  const cards = isHistorical
    ? histCards ?? emptyCards
    : railCards ?? emptyCards;

  return (
    <aside
      className={styles.rail}
      aria-label={translate(
        'descriptions.optimizedKpiSummary'
      )}
    >
      <ModeTitle label={modeTitle} />
      {cards.map((c) => (
        <div
          className={styles.card}
          key={c.label}
        >
          <div className={styles.cardLabel}>
            {c.label}
          </div>

          <div
            className={`${styles.cardValue} tnum`}
          >
            {c.value}
          </div>

          {c.delta && (
            <div
              className={`${styles.delta} ${styles[c.direction]}`}
            >
              {c.delta}
            </div>
          )}
        </div>
      ))}

      <div className={styles.divider} />

      <div className={styles.scopeRow}>
        <span>
          {isHistorical
            ? translate('metrics.skusInScope')
            : translate('metrics.skusSelected')}
        </span>
        <b>
          {isHistorical
            ? (tots ? tots.n_skus : allSkus.length || '…')
            : translate('descriptions.selectedOfTotal', {
                selected: config.selectedSkus.length,
                total: allSkus.length,
              })}
        </b>
      </div>

      {isHistorical && (
        <div className={styles.scopeRow}>
          <span>{translate('descriptions.priceReference')}</span>
          <PriceRefSelect value={economics} onChange={setEconomics} />
        </div>
      )}
    </aside>
  );
});

RailSidebar.displayName = 'RailSidebar';

/* ── Mode title badge ── */
const ModeTitle = ({ label }: { label: string }) => (
  <div style={{
    fontSize: 14,
    fontWeight: 800,
    color: 'var(--accent)',
    background: 'var(--accent-soft)',
    borderRadius: 6,
    padding: '8px 6px',
    marginBottom: 10,
    display: 'block',
    textAlign: 'center',
    lineHeight: 1.25,
  }}>
    {label}
  </div>
);

/* ── Price reference selector ── */
const PriceRefSelect = ({
  value,
  onChange,
}: {
  value: 'tn' | 'legacy';
  onChange: (v: 'tn' | 'legacy') => void;
}) => {
  const { t } = useTranslation();

  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(
          e.target.value as
            | 'tn'
            | 'legacy'
        )
      }
      style={{
        fontSize: 11,
        padding: '3px 5px',
        border:
          '1px solid var(--line)',
        borderRadius: 5,
        background: 'var(--surface)',
        color: 'var(--ink)',
        cursor: 'pointer',
      }}
    >
      <option value="tn">
        {t('descriptions.tripleNet')}
      </option>

      <option value="legacy">
        {t('descriptions.sellOut')}
      </option>
    </select>
  );
};

