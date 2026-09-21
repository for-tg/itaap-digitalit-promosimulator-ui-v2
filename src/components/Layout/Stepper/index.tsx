import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { STEP_LABELS, STAGE_IDS, type StageId } from '~/constants/simulator';
import { useSimulator } from '~/contexts/SimulatorContext';

import styles from './styles.module.css';

/**
 * Horizontal step progress indicator.
 * Steps are locked until the user has completed their first run.
 */
export const Stepper = memo(() => {
  const { stage, hasRun, maxReached, jumpStage } = useSimulator();
  const { t } = useTranslation();
  const currentIdx = STAGE_IDS.indexOf(stage);
  const stepLabels: Record<StageId, string> = {
    historical: t('navigation.historicalView', { defaultValue: STEP_LABELS.historical }),
    config: t('navigation.optimizationConfiguration', { defaultValue: STEP_LABELS.config }),
    optimized: t('navigation.optimizedView', { defaultValue: STEP_LABELS.optimized }),
  };

  return (
    <nav className={styles.stepper} aria-label={t('stepper.simulationSteps')}>
      {STAGE_IDS.map((id: StageId, i) => {
        const locked = !hasRun && i > maxReached;
        const isDone = !hasRun && i < currentIdx;
        const isActive = id === stage;

        return (
          <span key={id} className={styles.stepGroup}>
            <button
              className={`${styles.step} ${isActive ? styles.active : ''} ${isDone ? styles.done : ''}`}
              disabled={locked}
              onClick={() => jumpStage(id)}
              aria-current={isActive ? 'step' : undefined}
              aria-disabled={locked}
              title={locked ? t('stepper.completePreviousStepsFirst') : undefined}
            >
              <span className={styles.num}>{isDone ? '✓' : i + 1}</span>
              {stepLabels[id]}
            </button>
            {i < STAGE_IDS.length - 1 && (
              <span className={styles.link} aria-hidden="true" />
            )}
          </span>
        );
      })}
      {/* <span className={styles.lockNote}>Free navigation</span> */}
    </nav>
  );
});

Stepper.displayName = 'Stepper';
