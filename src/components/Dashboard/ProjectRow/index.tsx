import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useProjects } from '~/contexts/ProjectsContext';
import { useSimulator } from '~/contexts/SimulatorContext';
import { EditProjectModal } from '~/components/Dashboard/EditProjectModal';
import type { Project, Scenario, ApiScenarioStatus } from '~/types/project';
import styles from './styles.module.css';

interface Props {
  project: Project;
  viewMode: 'all' | 'deleted';
}

const STATUS_CLASSES: Record<ApiScenarioStatus, string> = {
  DRAFT: styles.statusDraft,
  COMPLETED: styles.statusComplete,
  FAILED: styles.statusFailed,
  RUNNING: styles.statusRunning,
};

export const ProjectRow = ({ project, viewMode }: Props) => {
  const { t } = useTranslation();
  const status_Labels: Record<ApiScenarioStatus, string> = {
    DRAFT: t('home.projectRow.statusDraft'),
    COMPLETED: t('home.projectRow.statusCompleted'),
    FAILED: t('home.projectRow.statusFailed'),
    RUNNING: t('home.projectRow.statusRunning'),
  };
  const {
    expandedIds,
    toggleExpanded,
    addScenario,
    deleteProject,
    restoreProject,
    permanentlyDeleteProject,
    deleteScenario,
    permanentlyDeleteScenario,
    restoreScenario,
    renameScenario,
  } =
    useProjects();
  const { reset } = useSimulator();
  const navigate = useNavigate();

  const isExpanded = expandedIds.has(project.id);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  // scenarioId being renamed → inline input value
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const visibleScenarios = viewMode === 'deleted'
    ? project.deleted
      ? project.scenarios
      : project.scenarios.filter((scenario) => scenario.deleted)
    : project.scenarios.filter((scenario) => !scenario.deleted);

  const handleOpenScenario = (scenario: Scenario) => {
    if (scenario.deleted) return;
    reset();
    navigate(`/project/${project.id}/scenario/${scenario.id}`, {
      state: { fromDashboardClick: true },
    });
  };

  const handleAddScenario = async () => {
    if (!newScenarioName.trim()) return;
    await addScenario(project.id, newScenarioName.trim());
    setNewScenarioName('');
  };

  const startRename = (s: Scenario) => {
    setRenamingId(s.id);
    setRenameValue(s.name);
  };

  const commitRename = (scenarioId: string) => {
    if (renameValue.trim()) void renameScenario(project.id, scenarioId, renameValue.trim());
    setRenamingId(null);
  };

  return (
    <>
      {/* Project row */}
      <tr
        className={`${styles.projectRow} ${project.deleted ? styles.deletedRow : ''}`}
        onClick={() => toggleExpanded(project.id, viewMode === 'all')}
        style={{ cursor: 'pointer' }}
      >
        <td>
          <span className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`}>
            ▶
          </span>
        </td>
        <td className={styles.projName}>
          {project.name}{' '}
          <span className={styles.scenCount}>
            {t(
              visibleScenarios.length === 1 ? 'home.scenarioCount_one' : 'home.scenarioCount_other',
              { count: visibleScenarios.length },
            )}
          </span>
        </td>
        <td>{project.market}</td>
        <td>{project.mag}</td>
        <td>{project.retailer}</td>
        <td className={styles.muted}>{project.period ?? '—'}</td>
        <td className={styles.muted}>{project.createdOn}</td>
        <td className={styles.muted}>{project.updatedOn}</td>
        <td onClick={(e) => e.stopPropagation()}>
          <div className={styles.actionIcons}>
            {project.deleted ? (
              <>
                <button
                  className={styles.iconBtn}
                  title={t('home.projectRow.restoreProject')}
                  onClick={() => void restoreProject(project.id)}
                >
                  ↩
                </button>
                <button
                  className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                  title={t('home.projectRow.deleteProjectPermanently')}
                  onClick={() => void permanentlyDeleteProject(project.id)}
                >
                  🗑
                </button>
              </>
            ) : viewMode === 'all' ? (
              <>
                <button
                  className={styles.iconBtn}
                  title={t('home.projectRow.editProject')}
                  onClick={() => setShowEditModal(true)}
                >
                  ✎
                </button>
                <button
                  className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                  title={t('home.projectRow.deleteProject')}
                  onClick={() => void deleteProject(project.id)}
                >
                  🗑
                </button>
              </>
            ) : (
              <span className={styles.muted}>—</span>
            )}
          </div>
        </td>
      </tr>

      {/* Scenario sub-rows */}
      {isExpanded &&
        visibleScenarios.map((s) => (
          <tr key={s.id} className={`${styles.scenarioRow} ${s.deleted || project.deleted ? styles.deletedRow : ''}`}>
            <td />
            <td>
              {renamingId === s.id ? (
                <input
                  className={styles.addScenInput}
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(s.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                />
              ) : (
                <button
                  className={styles.scenarioLink}
                  onClick={() => handleOpenScenario(s)}
                  disabled={s.deleted || project.deleted}
                >
                  {s.name}
                </button>
              )}
              {s.status !== 'COMPLETED' && (
                <span className={styles.scenarioFlags}>
                  {s.hasConfig && <span className={styles.flagDot} title={t('home.projectRow.configSaved')} />}
                  {s.hasResult && <span className={`${styles.flagDot} ${styles.flagDotResult}`} title={t('home.projectRow.resultStored')} />}
                </span>
              )}
            </td>
            <td colSpan={4} />
            <td className={styles.muted}>{s.updatedOn}</td>
            <td>
              <span className={`${styles.statusPill} ${STATUS_CLASSES[s.status]}`}>
                {status_Labels[s.status]}
              </span>
            </td>
            <td onClick={(e) => e.stopPropagation()}>
              <div className={styles.actionIcons}>
                {project.deleted ? (
                  <span className={styles.muted}>—</span>
                ) : s.deleted ? (
                  <>
                    <button
                      className={styles.iconBtn}
                      title={t('home.projectRow.restoreScenario')}
                      onClick={() => void restoreScenario(project.id, s.id)}
                    >
                      ↩
                    </button>
                    <button
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      title={t('home.projectRow.deletePermanent')}
                      onClick={() => void permanentlyDeleteScenario(project.id, s.id)}
                    >
                      🗑
                    </button>
                  </>
                ) : viewMode === 'all' ? (
                  <>
                    <button
                      className={styles.iconBtn}
                      title={t('home.projectRow.renameScenario')}
                      onClick={() => startRename(s)}
                    >
                      ✎
                    </button>
                    <button
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      title={t('home.projectRow.deleteScenario')}
                      onClick={() => void deleteScenario(project.id, s.id)}
                    >
                      🗑
                    </button>
                  </>
                ) : (
                  <button
                    className={styles.iconBtn}
                    title={t('home.projectRow.restoreScenario')}
                    onClick={() => void restoreScenario(project.id, s.id)}
                  >
                    ↩
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}

      {/* Add scenario row */}
      {isExpanded && viewMode === 'all' && !project.deleted && (
        <tr className={styles.addRow}>
          <td />
          <td colSpan={8}>
            <input
              className={styles.addScenInput}
              value={newScenarioName}
              onChange={(e) => setNewScenarioName(e.target.value)}
              placeholder={t('home.newScenarioName')}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddScenario(); }}
            />
            <button className={styles.addScenBtn} onClick={handleAddScenario}>
              {t('metrics.add')}
            </button>
          </td>
        </tr>
      )}

      {showEditModal && (
        <EditProjectModal project={project} onClose={() => setShowEditModal(false)} />
      )}
    </>
  );
};

