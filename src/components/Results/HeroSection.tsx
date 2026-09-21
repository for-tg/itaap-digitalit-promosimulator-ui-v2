import { useTranslation } from 'react-i18next';

interface Props {
  hero: {
    eyebrow: string;
    pill_text: string;
    value: string;
    label: string;
    delta: string;
    verdict: string;
    confidence: string;
    data_sub: string;
    margin_html: string;
    budget_used: string;
    budget_sub: string;
  };
}

export const HeroSection = ({ hero }: Props) => {
  const isGain = !hero.delta.startsWith('-');
  const { t } = useTranslation();

  return (
    <div className="hero big">
      <div className="eyebrow">{hero.eyebrow}</div>
      <div className="hero-value tnum">
        {hero.value} <span>{hero.label}</span>
      </div>
      <div className={`up-line ${isGain ? 'gain' : 'loss'}`}>{hero.delta}</div>
      <div className="verdict" dangerouslySetInnerHTML={{ __html: hero.verdict }} />
      <div className="hero-footer">
        <div>
          <div className="eyebrow">{t('optimizedView.cards.confidence')}</div>
          <b>{hero.confidence}</b>
          <small>{hero.data_sub}</small>
        </div>
        <div>
          <div className="eyebrow">{t('optimizedView.cards.budgetUsage')}</div>
          <b>{hero.budget_used}</b>
          {hero.budget_sub && <small>{hero.budget_sub}</small>}
        </div>
        <div>
          <div className="eyebrow">{t('optimizedView.cards.marginOutcome')}</div>
          <b dangerouslySetInnerHTML={{ __html: hero.margin_html }} />
        </div>
      </div>
    </div>
  );
};
