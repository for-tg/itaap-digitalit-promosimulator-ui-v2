import { useTranslation } from 'react-i18next';

import type { WhyReason } from '~/types/simulation';

interface Props {
  reasons: WhyReason[];
}

export const WhyReasons = ({ reasons }: Props) => {
  const { t } = useTranslation();
  if (!reasons.length) return null;

  return (
    <div className="section-block">
      <div className="section-head">{t('optimizedView.recommendationInsights.title')}</div>
      <div className="why-grid">
        {reasons.map((reason, i) => (
          <div key={i} className="why-card">
            <div className="why-num">{reason.num}</div>
            <span className="why-tag">{reason.tag}</span>
            <div className="why-title">{reason.title}</div>
            <div className="why-body" dangerouslySetInnerHTML={{ __html: reason.body }} />
          </div>
        ))}
      </div>
    </div>
  );
};
