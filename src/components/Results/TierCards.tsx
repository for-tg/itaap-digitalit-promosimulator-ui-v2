import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { TierBucket } from '~/types/simulation';

interface Props {
  tiers: {
    definitely_do: TierBucket;
    worth_considering: TierBucket;
    minor_impact: TierBucket;
  };
  objective: string;
  currencySymbol?: string;
}

export const TierCards = ({
  tiers,
  objective,
  currencySymbol = '',
}: Props) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [skuSearch, setSkuSearch] = useState('');

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  const { t } = useTranslation();

  const tier_Meta = [
    {
      key: 'definitely_do' as const,
      label: t('optimizedView.recommendations.highPriority'),
      cls: 'rec-card',
      gainCls: 'gain',
    },
    {
      key: 'worth_considering' as const,
      label: t('optimizedView.recommendations.mediumPriority'),
      cls: 'rec-card amber',
      gainCls: 'warn',
    },
    {
      key: 'minor_impact' as const,
      label: t('optimizedView.recommendations.lowPriority'),
      cls: 'rec-card gray',
      gainCls: '',
    },
  ];

  const unit =
    objective === 'turnover'
      ? t('metrics.revenue')
      : t('metrics.profit');

  const searchTerm = skuSearch.trim().toLowerCase();

  return (
    <div className="section-block">
      <div className="section-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span>{t('optimizedView.recommendations.title')}</span>
        {/* SKU search — filters all three tiers simultaneously */}
        <input
          type="search"
          value={skuSearch}
          onChange={(e) => setSkuSearch(e.target.value)}
          placeholder={t('optimizedView.recommendations.searchSku')}
          style={{
            height: 28, padding: '0 9px', fontSize: 12,
            border: '1px solid var(--line)', borderRadius: 6,
            background: 'var(--surface)', color: 'var(--ink)',
            outline: 'none', minWidth: 160,
          }}
        />
      </div>

      <div className="recommend">
        {tier_Meta.map(({ key, label, cls, gainCls }) => {
          const tier = tiers[key];
          // Apply SKU search filter across all tiers
          const filteredActions = searchTerm
            ? tier.actions.filter((a) => a.sku.toLowerCase().includes(searchTerm))
            : tier.actions;

          if (searchTerm && filteredActions.length === 0) return null;

          const isExpanded = expanded.has(key);
          const visible = isExpanded
            ? filteredActions
            : filteredActions.slice(0, 3);

          const remaining = filteredActions.length - 3;

          return (
            <div key={key} className={cls}>
              <div className="rc-top">
                <span className="rc-label">
                  {label}
                </span>

                <span className="rc-count">
                  {t('optimizedView.recommendations.actions', {
                    count: searchTerm ? filteredActions.length : tier.count,
                  })}
                  {searchTerm && filteredActions.length !== tier.count && (
                    <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
                      {' '}/{t('optimizedView.recommendations.actions', { count: tier.count })} {t('filters.all').toLowerCase()}
                    </span>
                  )}
                </span>
              </div>

              <div className={`rc-gain tnum ${gainCls}`}>
                {tier.total_gain >= 0 ? '+' : ''}
                {tier.total_gain.toLocaleString('en-US')}{' '}
                {currencySymbol} {unit}
              </div>

              <div className="rc-actions">
                {visible.map((action, i) => (
                  <div key={i} className="rc-action">
                    <b className="rc-sku">
                      {action.sku}
                    </b>

                    <span className="rc-week">
                      {action.weeks_label}
                    </span>

                    <span className="rc-text">
                      {action.action_text}
                    </span>

                    <span
                      className={`rc-impact tnum ${
                        action.impact >= 0
                          ? 'gain'
                          : 'loss'
                      }`}
                    >
                      {action.impact >= 0 ? '+' : ''}
                      {action.impact.toLocaleString('en-US')}{' '}
                      {currencySymbol}
                    </span>
                  </div>
                ))}

                {remaining > 0 && (
                  <button
                    className="rc-more"
                    onClick={() => toggle(key)}
                  >
                    {isExpanded
                      ? '▲ Show less'
                      : `+${remaining} more actions…`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};