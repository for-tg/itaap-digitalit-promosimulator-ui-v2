import { useTranslation } from 'react-i18next';

import type { TimelineEntry } from '~/types/simulation';
import type { CalMode } from '~/contexts/SimulatorContext';
import { DEPTH_COLORS } from '~/constants/simulator';

const QUARTER_WEEKS: Record<string, [number, number]> = {
  Q1: [1, 13], Q2: [14, 26], Q3: [27, 39], Q4: [40, 52],
};
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

interface Props {
  timeline: Record<string, TimelineEntry>;
  calMode: CalMode;
  setCalMode: (m: CalMode) => void;
  quarterFocus?: string[];            // selected quarters; empty / undefined = all
  onQuarterChange?: (qs: string[]) => void;
}

const depthColor = (disc: number): string => {
  if (disc <= 0) return 'var(--surface-2)';
  const idx = Math.min(Math.floor(disc / 5), DEPTH_COLORS.length - 1);
  return DEPTH_COLORS[idx];
};

const ALL_WEEKS = Array.from({ length: 52 }, (_, i) => i + 1);

export const Timeline = ({
  timeline, calMode, setCalMode, quarterFocus = [], onQuarterChange,
}: Props) => {
  const WEEKS = quarterFocus.length === 0
    ? ALL_WEEKS
    : ALL_WEEKS.filter((w) =>
        quarterFocus.some((q) => {
          const [lo, hi] = QUARTER_WEEKS[q] ?? [1, 52];
          return w >= lo && w <= hi;
        })
      );
  const { t } = useTranslation();
  const skus = Object.keys(timeline);
  if (!skus.length) return null;

  return (
    <div className="section-block cal-block">
      {/* Header controls — quarter focus filter lives inside the panel */}
      <div className="cal-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="section-head" style={{ margin: 0 }}>
            {t('optimizedView.calendar.promotionalCalendarWeeks', { weeks: WEEKS.length })}
          </div>
          {onQuarterChange && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <span style={{ fontWeight: 600, color: 'var(--body)', marginRight: 2 }}>
                {t('optimization.budget.showQuarter')}
              </span>
              {/* "All" clears the selection */}
              <button
                type="button"
                onClick={() => onQuarterChange([])}
                style={{
                  padding: '3px 8px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
                  border: '1px solid var(--line)',
                  background: quarterFocus.length === 0 ? 'var(--accent)' : 'var(--surface)',
                  color: quarterFocus.length === 0 ? '#fff' : 'var(--body)',
                  fontWeight: quarterFocus.length === 0 ? 700 : 400,
                }}
              >
                {t('optimization.budget.focusAllQuarters')}
              </button>
              {QUARTERS.map((q) => {
                const active = quarterFocus.includes(q);
                const toggle = () => {
                  const next = active
                    ? quarterFocus.filter((x) => x !== q)
                    : [...quarterFocus, q];
                  onQuarterChange(next);
                };
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={toggle}
                    style={{
                      padding: '3px 8px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
                      border: '1px solid var(--line)',
                      background: active ? 'var(--accent)' : 'var(--surface)',
                      color: active ? '#fff' : 'var(--body)',
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="seg">
          {(['recommended', 'actual', 'compare'] as const).map((m) => (
            <button
              key={m}
              className={calMode === m ? 'active' : ''}
              onClick={() => setCalMode(m)}
            >
              {m === 'recommended'
                ? t('optimizedView.calendar.optimized')
                : m === 'actual'
                  ? t('optimizedView.calendar.historical')
                  : t('optimizedView.calendar.compare')}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar grid — columns count matches filtered WEEKS, not always 52 */}
      <div className="calendar-wrap">
        <div className="calendar" style={{ gridTemplateColumns: `130px repeat(${WEEKS.length}, 1fr)` }}>
          {/* Header row */}
          <div className="cal-sku-head" />
          {WEEKS.map((w) => (
            <div key={w} className="cal-head">{w === 1 || w % 4 === 0 ? w : ''}</div>
          ))}

          {/* SKU rows — index by (w - 1) so W40 reads opt_disc[39], not opt_disc[0] */}
          {skus.map((sku) => {
            const entry = timeline[sku];
            return (
              <div key={sku} className="cal-row-group">
                <div className="cal-sku" title={sku}>
                  {sku.length > 14 ? sku.slice(0, 14) + '…' : sku}
                </div>
                {WEEKS.map((w) => {
                  const optDisc = entry.opt_disc[w - 1] ?? 0;
                  const actDisc = entry.act_disc[w - 1] ?? 0;

                  if (calMode === 'compare') {
                    return (
                      <div
                        key={w}
                        className="week week-split"
                        title={t('optimizedView.calendar.compareWeekTooltip', {
                          week: w, actual: actDisc, optimized: optDisc,
                        })}
                      >
                        <div style={{ background: depthColor(actDisc), flex: 1 }} />
                        <div style={{ background: depthColor(optDisc), flex: 1 }} />
                      </div>
                    );
                  }

                  const disc = calMode === 'recommended' ? optDisc : actDisc;
                  return (
                    <div
                      key={w}
                      className="week"
                      style={{ background: depthColor(disc) }}
                      title={t('optimizedView.calendar.weekTooltip', { week: w, discount: disc })}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Depth legend */}
      <div className="legend">
        <span style={{ color: 'var(--muted)', marginRight: 6 }}>
          {t('optimizedView.calendar.discountDepth')}:
        </span>
        <div className="legend-swatch" style={{ background: 'var(--surface-2)' }} />
        <span>{t('optimizedView.calendar.none')}</span>
        {DEPTH_COLORS.map((c, i) => (
          <div key={i} className="legend-swatch" style={{ background: c }} />
        ))}
        <span>
          {t('optimizedView.calendar.deepDiscountThreshold', {
            threshold: DEPTH_COLORS.length * 5,
          })}
        </span>
        {calMode === 'compare' && (
          <span style={{ marginLeft: 16, color: 'var(--muted)' }}>
            {t('optimizedView.calendar.historicalVsOptimized')}
          </span>
        )}
      </div>
    </div>
  );
};
