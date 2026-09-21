import { useTranslation } from 'react-i18next';

import type { CompareMetrics } from '~/types/simulation';

interface Props {
  compare: {
    current: CompareMetrics;
    historical?: CompareMetrics & { year: number };
    recommended: CompareMetrics & {
      effective_turnover: number;
      delta_effective_turnover: number;
      delta_effective_pct: number;
    };
  };
  currencySymbol?: string;
}

const fmt = (v: number, unit: string) => {
  if (unit === '%') return `${v.toFixed(1)}%`;
  return `${v.toLocaleString('en-US')} ${unit}`.trim();
};

export const CompareTable = ({
  compare,
  currencySymbol = '',
}: Props) => {
  const baseline = compare.historical ?? compare.current;
  const { t } = useTranslation();

  const metrics: Array<{
    label: string;
    key: keyof CompareMetrics;
    unit: string;
  }> = [
    {
      label: t('metrics.turnover'),
      key: 'turnover',
      unit: currencySymbol,
    },
    {
      label: t('metrics.profit'),
      key: 'profit',
      unit: currencySymbol,
    },
    {
      label: t('metrics.margin'),
      key: 'margin',
      unit: '%',
    },
    {
      label: t('metrics.volume'),
      key: 'qty',
      unit: t('metrics.units'),
    },
    {
      label: t('optimizedView.comparison.promoWeeks'),
      key: 'promo_weeks',
      unit: '',
    },
    {
      label: t('metrics.promoSpend'),
      key: 'promo_spend',
      unit: currencySymbol,
    },
  ];

  return (
    <div className="compare-panel">
      <div className="panel-head">
        {t('optimizedView.comparison.title')}
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>{t('optimizedView.comparison.metric')}</th>
            <th>{t('optimizedView.comparison.baseline')}</th>
            <th>{t('optimizedView.comparison.recommended')}</th>
          </tr>
        </thead>

        <tbody>
          {metrics.map(({ label, key, unit }) => {
            const base = baseline[key] as number;
            const rec = compare.recommended[key] as number;
            const diff = rec - base;
            const sign = diff >= 0 ? '+' : '';
            const diffClass = diff >= 0 ? 'gain' : 'loss';

            return (
              <tr key={key}>
                <td>{label}</td>

                <td className="tnum">
                  {fmt(base, unit)}
                </td>

                <td className="tnum">
                  {fmt(rec, unit)}{' '}
                  <span
                    className={diffClass}
                    style={{ fontSize: 11 }}
                  >
                    (
                    {sign}
                    {unit === '%'
                      ? `${diff.toFixed(1)}pp`
                      : `${diff.toLocaleString('en-US')}${
                          unit ? ` ${unit}` : ''
                        }`}
                    )
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};