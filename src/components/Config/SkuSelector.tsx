import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ANALYSIS_YEARS, PERIODS } from '~/constants/simulator';
import { useSimulator } from '~/contexts/SimulatorContext';
import { useSkus } from '~/hooks/useSkus';
import styles from '~/screens/SimulatorScreen/stages/ConfigStage/styles.module.css';

interface Props {
  onFooterAlert: (msg: string) => void;
}

// SKU & Time Period selection panel — handles SKU picking, band shortcuts and period config
export const SkuSelector = ({ onFooterAlert }: Props) => {
  const { config, updateConfig, allSkus } = useSimulator();
  const { error: skuError, isLoading: skuLoading } = useSkus();
  const uniqueBands = [...new Set(allSkus.map((s) => s.band))].filter(Boolean);
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [tempSelectedSkus, setTempSelectedSkus] = useState<string[]>([]);
  const { t } = useTranslation();

  const openSkuModal = () => {
    setTempSelectedSkus(config.selectedSkus);
    setSkuModalOpen(true);
  };

  const handleTempSkuToggle = (sku: string) => {
    setTempSelectedSkus((prev) =>
      prev.includes(sku)
        ? prev.filter((s) => s !== sku)
        : [...prev, sku]
    );
  };

  const handleAddSkus = () => {
    updateConfig({ selectedSkus: tempSelectedSkus });
    setSkuModalOpen(false);
  };
  // — SKU selection handlers —
  const handleSkuToggle = (sku: string) => {
    const next = config.selectedSkus.includes(sku)
      ? config.selectedSkus.filter((s) => s !== sku)
      : [...config.selectedSkus, sku];
    updateConfig({ selectedSkus: next });
  };

  const handleSelectAllSkus = () => {
    updateConfig({ selectedSkus: allSkus.map((s) => s.sku) });
    onFooterAlert(t('optimization.skuSelection.skusAddedRunning', { count: allSkus.length }));
  };

  const handleClearSkus = () => updateConfig({ selectedSkus: [] });

  // treat "no skus loaded yet" as all-selected so the button is active by default
  const isAllSelected =
    allSkus.length === 0 ||
    allSkus.every((s) => config.selectedSkus.includes(s.sku));

  // suppress band highlight when all SKUs are selected — only show active for explicit band-only selections
  const isBandFullySelected = (band: string) => {
    if (isAllSelected) return false;
    const bandSkus = allSkus.filter((s) => s.band === band).map((s) => s.sku);
    return (
      bandSkus.length > 0 &&
      bandSkus.every((sku) => config.selectedSkus.includes(sku))
    );
  };

  const handleAddBand = (band: string) => {
    const bandSkus = allSkus.filter((s) => s.band === band).map((s) => s.sku);
    const merged = Array.from(new Set([...config.selectedSkus, ...bandSkus]));
    updateConfig({ selectedSkus: merged });
    onFooterAlert(
      t('optimization.skuSelection.bandSkusAddedRunning', { count: bandSkus.length, band })
    );
  };

  return (
    <section className={styles.cell}>
      <h3 className={styles.sectionTitle}>{t('optimization.skuSelection.title')}</h3>
      <p className={styles.sectionSub}>
        {t('optimization.skuSelection.description')}
      </p>

      {skuError && (
        <p style={{ color: 'red', marginBottom: '10px' }}>⚠️ {skuError}</p>
      )}
      {skuLoading && (
        <p style={{ color: '#666', marginBottom: '10px' }}>{t('optimization.skuSelection.loadingSkus')}</p>
      )}

      {/* — SKU picker dropdown and band shortcuts — */}
      <div className={styles.skuHeader}>
        <span className={styles.groupLabel}>
          {t('optimization.skuSelection.selectedSkus', { count: config.selectedSkus.length })}
        </span>
      </div>
      <div className={styles.skuControls}>

        <button
          type="button"
          className="mini-btn"
          onClick={openSkuModal}
        >
          {t('optimization.skuSelection.addSku')}
        </button>
        {uniqueBands.map((band) => (
          <button
            key={band}
            type="button"
            className={`mini-btn ${isBandFullySelected(band) ? styles.miniBtnActive : ''}`}
            onClick={() => handleAddBand(band)}
          >
            + {band}
          </button>
        ))}
        <button type="button" className="mini-btn" onClick={handleClearSkus}>
          {t('actions.clear')}
        </button>
        <button
          type="button"
          className={`mini-btn ${isAllSelected ? styles.miniBtnActive : ''}`}
          onClick={handleSelectAllSkus}
        >
          {t('filters.all')}
        </button>
      </div>

      {/* — Selected SKU chips — */}
      <div className={styles.skuChipArea}>
        {config.selectedSkus.length === 0 && (
          <p className={styles.hint}>{t('optimization.skuSelection.selectSku')}</p>
        )}
        {config.selectedSkus.map((sku) => (
          <button
            key={sku}
            type="button"
            className={styles.skuChip}
            onClick={() => handleSkuToggle(sku)}
            title={t('optimization.skuSelection.removeSku')}
          >
            {sku} <span>x</span>
          </button>
        ))}
      </div>

      {/* — Time period controls (mode-specific) — */}
      {config.mode === 'Retrospective' && (
        <div className={styles.fieldRow}>
          <div className={`${styles.fieldBlock} ${styles.compactFieldBlock}`}>
            <label className={styles.groupLabel}>{t('filters.year')}</label>
            <select
              className={`${styles.wideSelect} ${styles.compactSelect}`}
              value={config.year}
              onChange={(e) => updateConfig({ year: Number(e.target.value) })}
            >
              {ANALYSIS_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldBlock}>
            <label className={styles.groupLabel}>{t('optimization.skuSelection.period')}</label>
            <div className={styles.segment} role="group" aria-label={t('optimization.skuSelection.period')}>
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={config.period === p ? styles.segmentActive : ''}
                  onClick={() => updateConfig({ period: p })}
                >
                  {p === 'fullYear'
                    ? t('optimization.skuSelection.fullYear')
                    : t(p)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {config.mode === 'Forward-looking' && (
        <>
          <div className={styles.forwardYearRow}>
            <div className={`${styles.fieldBlock} ${styles.compactFieldBlock}`}>
              <label className={styles.groupLabel}>{t('optimization.skuSelection.planningYear')}</label>
              <select
                className={`${styles.wideSelect} ${styles.compactSelect}`}
                value={config.planYear}
                onChange={(e) =>
                  updateConfig({ planYear: Number(e.target.value) })
                }
              >
                {ANALYSIS_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.fieldBlock} ${styles.compactFieldBlock}`}>
              <label className={styles.groupLabel}>{t('optimization.skuSelection.baseTemplateYear')}</label>
              <select
                className={`${styles.wideSelect} ${styles.compactSelect}`}
                value={config.baseYear}
                onChange={(e) =>
                  updateConfig({ baseYear: Number(e.target.value) })
                }
              >
                {ANALYSIS_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <label className={styles.yoyCheckbox}>
              <input
                type="checkbox"
                checked={config.useTrend}
                onChange={(e) => updateConfig({ useTrend: e.target.checked })}
              />
              {t('optimization.skuSelection.applyYoyGrowth')}
            </label>
          </div>
        </>
      )}
      {skuModalOpen && (
  <div
    className={styles.modalOverlay}
    onClick={() => setSkuModalOpen(false)}
  >
    <div
      className={styles.skuModal}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.modalHeader}>
        <h2>{t('optimization.skuSelection.selectSkus')}</h2>
      </div>

      <div className={styles.skuGrid}>
        {allSkus.map((sku) => (
          <label key={sku.sku} className={styles.skuItem}>
            <input
              type="checkbox"
              checked={tempSelectedSkus.includes(sku.sku)}
              onChange={() => handleTempSkuToggle(sku.sku)}
            />
            {sku.sku}
          </label>
        ))}
      </div>

      <div className={styles.modalFooter}>
        <button
  type="button"
  className={styles.cancelBtn}
  onClick={() => setSkuModalOpen(false)}
>
  {t('actions.cancel')}
</button>

<button
  type="button"
  className={styles.addBtn}
  onClick={handleAddSkus}
>
  {t('optimization.skuSelection.addSelected')}
</button>

        
      </div>
    </div>
  </div>
)}
    </section>
  );
};
