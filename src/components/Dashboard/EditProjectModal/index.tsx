import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useProjects } from '~/contexts/ProjectsContext';
import type { Project } from '~/types/project';
import styles from '../CreateProjectModal/styles.module.css';

interface Props {
  project: Project;
  onClose: () => void;
}

export const EditProjectModal = ({ project, onClose }: Props) => {
  const { t } = useTranslation();
  const { updateProject } = useProjects();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSave = Boolean(name.trim()) && !isSubmitting;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await updateProject(project.id, name.trim(), description);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('errors.updateProjectFailed'));
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
      aria-labelledby="edit-modal-title"
    >
      <div className={styles.modal}>
        <div className={styles.head}>
          <h2 id="edit-modal-title">{t('home.projectRow.editProject')}</h2>
          <button className={styles.close} onClick={onClose} aria-label={t('actions.close')}>×</button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label htmlFor="ep-name">* {t('home.createProjectModal.projectName')}</label>
            <input
              id="ep-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('home.createProjectModal.enterProjectName')}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="ep-market">{t('filters.market')}</label>
            <input id="ep-market" value={project.market} disabled />
          </div>

          <div className={styles.field}>
            <label htmlFor="ep-mag">{t('filters.mag')}</label>
            <input id="ep-mag" value={project.mag} disabled />
          </div>

          <div className={styles.field}>
            <label htmlFor="ep-retailer">{t('filters.retailer')}</label>
            <input id="ep-retailer" value={project.retailer} disabled />
          </div>

          <div className={styles.field}>
            <label htmlFor="ep-desc">{t('home.createProjectModal.description')}</label>
            <textarea
              id="ep-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('home.createProjectModal.enterProjectDescription')}
            />
          </div>
        </div>

        <div className={styles.foot}>
          {submitError && (
            <p style={{ color: 'var(--critical)', fontSize: 12, marginRight: 'auto' }}>
              {submitError}
            </p>
          )}
          <button className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>
            {t('actions.cancel')}
          </button>
          <button
            className={styles.btnCreate}
            disabled={!canSave}
            onClick={() => void handleSave()}
          >
            {isSubmitting ? t('actions.saving') : t('actions.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
};
