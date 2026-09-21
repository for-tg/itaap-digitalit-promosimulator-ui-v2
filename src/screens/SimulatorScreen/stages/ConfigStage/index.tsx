import { useSimulator } from '~/contexts/SimulatorContext';
import { useRunSimulation } from '~/hooks/useRunSimulation';
import styles from './styles.module.css';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RunConfirmDialog } from '~/components/Config/RunConfirmDialog';
import { SkuSelector } from '~/components/Config/SkuSelector';
import { BudgetPhasing } from '~/components/Config/BudgetPhasing';

export const ConfigStage = () => {
  const { config, updateConfig, advanceTo, resetConfig } = useSimulator();
  const { isRunning, run } = useRunSimulation();
  const { t } = useTranslation();

  // — Footer alert state —
  const [footerAlert, setFooterAlert] = useState<string | null>(null);

  useEffect(() => {
    if (!footerAlert) return;
    const timer = setTimeout(() => setFooterAlert(null), 6000);
    return () => clearTimeout(timer);
  }, [footerAlert]);

  // — Optimization objective preset shortcuts —
  const objectiveMode =
    config.blend >= 70 ? 'profit' : config.blend <= 30 ? 'revenue' : 'balanced';

  const setObjectiveMode = (mode: 'profit' | 'balanced' | 'revenue') => {
    if (mode === 'profit') updateConfig({ blend: 100 });
    if (mode === 'balanced') updateConfig({ blend: 50 });
    if (mode === 'revenue') updateConfig({ blend: 0 });
  };

  // — Run confirmation dialog —
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirmRun = async () => {
    setConfirmOpen(false);
    const err = await run();
    if (!err) advanceTo('optimized');
  };

  const handleRun = () => {
    if (config.selectedSkus.length > 15) {
      setConfirmOpen(true);
    } else {
      handleConfirmRun();
    }
  };

  return (
    <div className={styles.stage}>
      <div className={styles.body}>
        <section className={styles.canvas}>
          <header className={styles.head}>
            <div className={styles.headTop}>
              <div>
                <h2>{t('optimization.configurePromotionScenario')}</h2>
                <p>
                  {config.mode === 'Retrospective' 
                    ? t('optimization.retrospectiveDescription')
                    : t('optimization.forwardLookingDescription')
                  }
                </p>
              </div>
              <div className={styles.analysisTypeControl}>
                <span className={styles.groupLabel}>{t('optimization.analysisType')}</span>
                <div className={styles.segment} role="group" aria-label={t('optimization.analysisType')}>
                  <button
                    type="button"
                    className={config.mode === 'Retrospective' ? styles.segmentActive : ''}
                    onClick={() => updateConfig({ mode: 'Retrospective' })}
                  >
                    {t('optimization.retrospective')}
                  </button>
                  <button
                    type="button"
                    className={config.mode === 'Forward-looking' ? styles.segmentActive : ''}
                    onClick={() => updateConfig({ mode: 'Forward-looking' })}
                  >
                    {t('optimization.forwardLooking')}
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className={styles.grid}>
            <section className={styles.cell}>
              <h3 className={styles.sectionTitle}>{t('optimization.objective.title')}</h3>
              <p className={styles.sectionSub}>{t('optimization.objective.description')}</p>

              <div className={styles.segment} role="group" aria-label={t('optimization.objective.optimizationPreset')}>
                <button
                  type="button"
                  className={objectiveMode === 'profit' ? styles.segmentActive : ''}
                  onClick={() => setObjectiveMode('profit')}
                >
                  {t('metrics.profit')}
                </button>
                <button
                  type="button"
                  className={objectiveMode === 'balanced' ? styles.segmentActive : ''}
                  onClick={() => setObjectiveMode('balanced')}
                >
                  {t('optimization.objective.balanced')}
                </button>
                <button
                  type="button"
                  className={objectiveMode === 'revenue' ? styles.segmentActive : ''}
                  onClick={() => setObjectiveMode('revenue')}
                >
                  {t('metrics.revenue')}
                </button>
              </div>

              <div className={styles.sliderBlock}>
                <div className={styles.sliderMeta}>{t('optimization.objective.profitRevenueBlend')}</div>
                <div className={styles.sliderValue}>{t('optimization.objective.profitPercentage', { value: config.blend })}</div>
                <input
                  type="range"
                  className="range"
                  min={0}
                  max={100}
                  value={config.blend}
                  onChange={(e) => updateConfig({ blend: Number(e.target.value) })}
                />
                <p className={styles.helper}>{t('optimization.objective.calendarImpact')}</p>
              </div>
            </section>

            <section className={styles.cell}>
              <h3 className={styles.sectionTitle}>{t('optimization.guardrails.title')}</h3>
              <div className={styles.twoCol}>
                <div className={styles.sliderBlock}>
                  <div className={styles.sliderMeta}>{t('optimization.guardrails.maxDiscountDepth')}</div>
                  <div className={styles.sliderValue}>{config.maxDiscount}%</div>
                  <input
                    type="range"
                    className="range"
                    min={0}
                    max={60}
                    value={config.maxDiscount}
                    onChange={(e) => updateConfig({ maxDiscount: Number(e.target.value) })}
                  />
                </div>

                <div className={styles.sliderBlock}>
                  <div className={styles.sliderMeta}>{t('optimization.guardrails.marginFloor')}</div>
                  <div className={styles.sliderValue}>{config.marginFloor}%</div>
                  <input
                    type="range"
                    className="range"
                    min={0}
                    max={50}
                    value={config.marginFloor}
                    disabled={!config.marginFloorOn}
                    onChange={(e) => updateConfig({ marginFloor: Number(e.target.value) })}
                  />
                </div>
              </div>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={config.marginFloorOn}
                  onChange={(e) => updateConfig({ marginFloorOn: e.target.checked })}
                />
                {t('optimization.guardrails.enforceMinimumMargin')}
              </label>
            </section>

            {/* — SKU & Time Period section — */}
            <SkuSelector onFooterAlert={setFooterAlert} />

            {/* — Budget & Phasing section — */}
            <BudgetPhasing />

          </div>
        </section>
      </div>

      {/* — Run confirmation popup — */}
      {confirmOpen && (
        <RunConfirmDialog
          skuCount={config.selectedSkus.length}
          onConfirm={handleConfirmRun}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      {/* Footer run button */}
      <div className={styles.footer}>
        <span className={footerAlert ? styles.footerAlertRed : styles.rerunNote}>
          {footerAlert ?? t('messages.skusSelected', { count: config.selectedSkus.length })}
        </span>
        <div className={styles.footerActions}>
          <button
            className={styles.resetBtn}
            onClick={resetConfig}
            title={t('optimization.resetDefaults')}
            disabled={isRunning}
          >
            {t('actions.reset')}
          </button>
          <button
            className={styles.runBtn}
            disabled={isRunning || config.selectedSkus.length === 0}
            onClick={handleRun}
          >
            {isRunning ? t('actions.running') : t('actions.runOptimization')}
          </button>
        </div>
      </div>
    </div>
  );
};
