import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useProjects } from '~/contexts/ProjectsContext';
import { MARKET_OPTIONS, MAG_MAP, RETAILER_MAP, ENABLED_MARKETS } from '~/constants/simulator';
import type { Market } from '~/constants/simulator';
import { setActiveMarket } from '~/utils/apiClient';
import styles from './styles.module.css';

interface Props {
  onClose: () => void;
}

/**
 * Modal for creating a new project.
 * Market → MAG → Retailer dropdowns cascade automatically.
 */
export const CreateProjectModal = ({ onClose }: Props) => {
  const { createProject } = useProjects();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [market, setMarket] = useState<Market | ''>('');
  const [mag, setMag] = useState('');
  const [retailer, setRetailer] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mags = market ? (MAG_MAP[market] ?? []) : [];
  const retailers = market && mag ? (RETAILER_MAP[`${market}|${mag}`] ?? []) : [];

  const isMarketEnabled = market !== '' && ENABLED_MARKETS.includes(market as Market);
  const canCreate = Boolean(name.trim() && market && mag && retailer && isMarketEnabled && !isSubmitting);

  const handleMarketChange = (m: Market | '') => {
    setMarket(m);
    if (m) setActiveMarket(m);
    const newMags = m ? (MAG_MAP[m as Market] ?? []) : [];
    const autoMag = newMags.length === 1 ? newMags[0] : '';
    setMag(autoMag);
    const newRets = m && autoMag ? (RETAILER_MAP[`${m}|${autoMag}`] ?? []) : [];
    setRetailer(newRets.length === 1 ? newRets[0] : '');
  };

  const handleMagChange = (m: string) => {
    setMag(m);
    const newRets = market && m ? (RETAILER_MAP[`${market}|${m}`] ?? []) : [];
    setRetailer(newRets.length === 1 ? newRets[0] : '');
  };

  const handleCreate = async () => {
    if (!canCreate) return;
    setIsSubmitting(true);
    try {
      await createProject({ name: name.trim(), market, mag, retailer, description });
      onClose();
    } catch {
      // toast shown by context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={styles.modal}>
        <div className={styles.head}>
          <h2 id="modal-title">{t('home.createNewProject')}</h2>
          <button className={styles.close} onClick={onClose} aria-label={t('home.createProjectModal.close')}>×</button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label htmlFor="np-name">* {t('home.createProjectModal.projectName')}</label>
            <input
              id="np-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('home.createProjectModal.enterProjectName')}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="np-market">* {t('filters.market')}</label>
            <select
              id="np-market"
              value={market}
              onChange={(e) => handleMarketChange(e.target.value as Market | '')}
            >
              <option value="">{t('home.createProjectModal.selectMarket')}</option>
              {MARKET_OPTIONS.map((m) => (
                <option key={m} value={m} disabled={!ENABLED_MARKETS.includes(m)}>
                  {m}{!ENABLED_MARKETS.includes(m) ? ` (${t('home.createProjectModal.comingSoon')})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="np-mag">* {t('filters.mag')}</label>
            <select
              id="np-mag"
              value={mag}
              onChange={(e) => handleMagChange(e.target.value)}
              disabled={mags.length === 0}
            >
              {mags.length === 0 ? (
                <option>{t('home.createProjectModal.selectMarketFirst')}</option>
              ) : (
                mags.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))
              )}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="np-retailer">* {t('filters.retailer')}</label>
            <select
              id="np-retailer"
              value={retailer}
              onChange={(e) => setRetailer(e.target.value)}
              disabled={retailers.length === 0}
            >
              {retailers.length === 0 ? (
                <option>{t('home.createProjectModal.selectMagFirst')}</option>
              ) : (
                retailers.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))
              )}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="np-desc">{t('home.createProjectModal.description')}</label>
            <textarea
              id="np-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('home.createProjectModal.enterProjectDescription')}
            />
          </div>
        </div>

        <div className={styles.foot}>
          <button className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>{t('actions.cancel')}</button>
          <button
            className={styles.btnCreate}
            disabled={!canCreate}
            onClick={() => void handleCreate()}
          >
            {isSubmitting ? t('home.createProjectModal.creating') : t('home.createProjectModal.createProject')}
          </button>
        </div>
      </div>
    </div>
  );
};
