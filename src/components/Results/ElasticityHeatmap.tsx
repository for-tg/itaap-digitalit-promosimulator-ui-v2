import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SimulationResponse } from '~/types/simulation';

interface Props {
  elasticity: SimulationResponse['elasticity'];
  selectedSkus: string[];
  currencySymbol?: string;
}

// Sequential white → blue: intensity = β / maxBeta.
// Uses the app's --accent blue (#0a5fb4) so it stays on-brand.
function betaColor(beta: number | null, maxBeta: number): string {
  if (beta == null) return 'var(--surface-2)';
  if (maxBeta === 0) return 'var(--surface-2)';
  const intensity = Math.round(Math.min(beta / maxBeta, 1) * 100);
  return `color-mix(in oklab, var(--accent, #0a5fb4) ${intensity}%, var(--surface-2))`;
}

export const ElasticityHeatmap = memo(({ elasticity, selectedSkus }: Props) => {
  const { t } = useTranslation();
  const [tooltip, setTooltip] = useState<null | {
    x: number; y: number; sku: string; week: number; beta: number;
  }>(null);

  const perSku = elasticity.per_sku ?? {};

  // Build SKU list in selection order, filter to those with beta data
  const skus = selectedSkus.filter((s) => perSku[s]?.beta_weekly?.length);

  // Build week union
  const weekSet = new Set<number>();
  skus.forEach((s) => perSku[s].beta_weekly?.forEach((b) => weekSet.add(b.week)));
  const weeks = Array.from(weekSet).sort((a, b) => a - b);

  // Build lookup and find max β
  const grid = new Map<string, number>();
  let maxBeta = 0;
  skus.forEach((s) => {
    perSku[s].beta_weekly?.forEach(({ week, value }) => {
      grid.set(`${s}__${week}`, value);
      if (value > maxBeta) maxBeta = value;
    });
  });

  if (skus.length === 0) {
    return <p className="note" style={{ padding: 24 }}>{t('common.noData')}</p>;
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ padding: '14px 16px', overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '2px', fontSize: 10.5, width: '100%', tableLayout: 'fixed' }}
          role="img" aria-label={t('tabs.elasticity')}>
          <colgroup><col style={{ width: 140 }} /></colgroup>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, zIndex: 2, background: 'var(--surface)', fontSize: 0 }} />
              {weeks.map((wk) => (
                <th key={wk} style={{ fontSize: 8, color: 'var(--muted)', textAlign: 'center', padding: '2px 0', fontWeight: 400 }}>
                  {wk % 4 === 0 || wk === 1 ? wk : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {skus.map((sku) => (
              <tr key={sku}>
                <td style={{
                  position: 'sticky', left: 0, zIndex: 1,
                  fontSize: 10.5, fontWeight: 600, color: 'var(--ink)',
                  background: 'var(--surface-2)', borderRadius: 3,
                  padding: '4px 6px', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {sku}
                </td>
                {weeks.map((wk) => {
                  const b = grid.get(`${sku}__${wk}`) ?? null;
                  return (
                    <td key={wk}
                      onMouseEnter={(e) => b != null && setTooltip({ x: e.clientX, y: e.clientY, sku, week: wk, beta: b })}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        height: 20, borderRadius: 2,
                        background: betaColor(b, maxBeta),
                        cursor: b != null ? 'pointer' : 'default',
                        transition: 'opacity 0.1s',
                      }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 4px 4px', flexWrap: 'wrap', fontSize: 11, color: 'var(--body)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 90, height: 10, borderRadius: 3, background: 'linear-gradient(to right, var(--surface-2), var(--accent, #0a5fb4))' }} />
          {t('elasticityHeatmap.legend')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: 'var(--surface-2)', border: '1px solid var(--line)' }} />
          {t('elasticityHeatmap.noData')}
        </span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 10,
          background: '#213b55', color: '#fff', borderRadius: 6,
          padding: '8px 12px', fontSize: 11, pointerEvents: 'none', zIndex: 999, lineHeight: 1.7,
        }}>
          <b>{tooltip.sku}</b> · W{tooltip.week}<br />
          {t('elasticityHeatmap.beta')}: {tooltip.beta.toFixed(2)}<br />
          {tooltip.beta >= 1.0
            ? t('elasticityHeatmap.highElasticity')
            : t('elasticityHeatmap.lowElasticity')}
        </div>
      )}
    </div>
  );
});

ElasticityHeatmap.displayName = 'ElasticityHeatmap';
