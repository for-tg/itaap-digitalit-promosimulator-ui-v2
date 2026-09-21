import { useSimulator } from '~/contexts/SimulatorContext';
import type { SimulationResponse } from '~/types/simulation';
import { HeroSection } from './HeroSection';
import { CompareTable } from './CompareTable';
import { TierCards } from './TierCards';
import { WhyReasons } from './WhyReasons';
import { Timeline } from './Timeline';
import { VolumeTab } from './VolumeTab';
import { ElasticityHeatmap } from './ElasticityHeatmap';
import { OptimizedHeatmap } from './OptimizedHeatmap';
import './styles.css';

interface Props {
  results: SimulationResponse;
}

export const ResultsPanel = ({ results }: Props) => {
  const {
    optimizedTab,
    config,
    calMode, setCalMode,
    updateConfig,
  } = useSimulator();


  const currencySymbol = results.currency?.symbol ?? '';

  return (
    <div className="results-panel">

      {/* ── Summary: hero + compare + why reasons ── */}
      {optimizedTab === 'summary' && (
        <>
          <div className="summary-grid">
            <HeroSection hero={results.hero} />
            <CompareTable compare={results.compare} currencySymbol={currencySymbol} />
          </div>
          <WhyReasons reasons={results.why_reasons} />
        </>
      )}

      {/* ── Elasticity: SKU × Week |β| heat map ── */}
      {optimizedTab === 'elasticity' && (
        <div style={{ padding: '8px 0' }}>
          <ElasticityHeatmap
            elasticity={results.elasticity}
            selectedSkus={config.selectedSkus}
            currencySymbol={currencySymbol}
          />
        </div>
      )}

      {/* ── Promo Effectiveness: SKU × Week heat map ── */}
      {optimizedTab === 'promoeffectiveness' && (
        <OptimizedHeatmap
          results={results}
          selectedSkus={config.selectedSkus}
        />
      )}

      {/* ── Calendar: discount timeline + What to do next ── */}
      {optimizedTab === 'calendar' && (
        <>
          <Timeline
            timeline={results.timeline}
            calMode={calMode}
            setCalMode={setCalMode}
            quarterFocus={config.quarterFocus}
            onQuarterChange={(qs) => updateConfig({ quarterFocus: qs })}
          />
          <TierCards tiers={results.tiers} objective={results.objective} currencySymbol={currencySymbol} />
        </>
      )}

      {/* ── Volume: stacked baseline + incremental units bars ── */}
      {optimizedTab === 'volume' && (
        <VolumeTab results={results} quarterFocus={config.quarterFocus} />
      )}

    </div>
  );
};
