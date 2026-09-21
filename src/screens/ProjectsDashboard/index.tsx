import { useMsal } from '@azure/msal-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { CreateProjectModal } from '~/components/Dashboard/CreateProjectModal';
import { ProjectRow } from '~/components/Dashboard/ProjectRow';
import { LanguageSelector } from '~/components/Layout/LanguageSelector';
import { useProjects } from '~/contexts/ProjectsContext';
import { useTheme } from '~/contexts/ThemeContext';
import { fetchMyAccess } from '~/services/rbacService';
import { appConfigs } from '~/utils/appConfig';
import rgmPhcatLogo from '~/assets/images/rgm_phcat_logo.png';
import philipsLogo from '~/assets/images/LOGO_PHILIPS.png';
import { hasAdminRole } from '~/utils/authRoles';

import styles from './styles.module.css';

type Tab = 'all' | 'deleted';

/**
 * Root screen — lists all projects and their scenarios.
 * Projects can be created, expanded, soft-deleted and restored.
 */
export const ProjectsDashboard = () => {
  const { projects, isLoading, error, toast } = useProjects();
  const { toggleTheme } = useTheme();
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [hasRequestedAccess, setHasRequestedAccess] = useState(false);
  const { t } = useTranslation();

  const activeAccount = instance.getActiveAccount() ?? accounts[0] ?? null;
  const displayName = activeAccount?.name ?? activeAccount?.username ?? t('common.defaultUser');
  const isAdmin = hasAdminRole(activeAccount);

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const allProjects = useMemo(() => projects.filter((p) => !p.deleted), [projects]);
  const deletedEntries = useMemo(
    () => projects.filter((p) => p.deleted || p.scenarios.some((scenario) => scenario.deleted)),
    [projects]
  );
  const visible = activeTab === 'all' ? allProjects : deletedEntries;

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  const handleSignOut = () => {
    if (appConfigs.ENABLE_SSO) {
      void instance.logoutRedirect();
    }
  };

  useEffect(() => {
    if (isAdmin) return;

    let cancelled = false;
    const loadMyAccess = async () => {
      try {
        const response = await fetchMyAccess();
        const hasHistory = response.access.regions.some((region) =>
          region.countries.some((country) =>
            country.mags.some((mag) => mag.retailers.length > 0),
          ),
        );
        if (!cancelled) {
          setHasRequestedAccess(hasHistory);
        }
      } catch {
        if (!cancelled) {
          setHasRequestedAccess(false);
        }
      }
    };

    void loadMyAccess();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  return (
    <div className={styles.shell}>
      {/* Header */}
      <header className={styles.topbar} role="banner">
        <img
          className={styles.logo}
          src={rgmPhcatLogo}
          alt={t('app.rgmAndPhcat')}
        />
        <div className={styles.brand}>
          {t('app.title')}
          <small>{t('app.subtitle')} · Philips</small>
        </div>
        <div className={styles.spacer} />

        {isAdmin ? (
          <button
            className="icon-btn"
            onClick={() => navigate('/admin/access')}
          >
            {t('app.admin')}
          </button>
        ) : (
          <button
            className="icon-btn"
            onClick={() => navigate('/access')}
          >
            {hasRequestedAccess ? t('access.request.viewRequest') : t('app.regionAccess')}
          </button>
        )}

        <img
          className={styles.logoPhilips}
          src={philipsLogo}
          alt="Philips"
        />
        <LanguageSelector />
        <button className="icon-btn" onClick={toggleTheme}>
          ◑ {t('home.theme')}
        </button>
        <div className={styles.user}>
          <b>{displayName}</b>
          <span className={styles.avatar} aria-hidden="true">
            {initials}
          </span>
        </div>
        {appConfigs.ENABLE_SSO && (
          <button className="icon-btn" onClick={handleSignOut}>
            {t('common.signOut')}
          </button>
        )}
      </header>

      {/* Page body */}
      <main className={styles.main}>
        <button className={styles.createBtn} onClick={() => setShowModal(true)}>
          <span className={styles.createPlus}>+</span>
          {t('home.createNewProject')}
        </button>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('all')}
          >
            {t('home.tabs.allProjects', { count: allProjects.length })}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'deleted' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('deleted')}
          >
            {t('home.tabs.deletedItems', { count: deletedEntries.length })}
          </button>
        </div>

        {isLoading && <div className={styles.empty}>{t('common.loading')}</div>}

        {!isLoading && error && (
          <div className={styles.empty} style={{ color: 'var(--critical)' }}>
            {error}
          </div>
        )}

        {!isLoading && !error && visible.length === 0 ? (
          <div className={styles.empty}>
            {activeTab === 'all' ? (
              <>
                {t('home.noProjectsYet')}{' '}
                <button
                  className={styles.emptyLink}
                  onClick={() => setShowModal(true)}
                >
                  {t('home.createYourFirstProject')} →
                </button>
              </>
            ) : (
              <>{t('home.noDeletedItems')}</>
            )}
          </div>
        ) : (
          !isLoading &&
          !error && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th />
                    <th>{t('home.table.scenario')}</th>
                    <th>{t('home.table.market')}</th>
                    <th>{t('home.table.mag')}</th>
                    <th>{t('home.table.retailer')}</th>
                    <th>{t('optimization.skuSelection.period')}</th>
                    <th>{t('home.table.createdOn')}</th>
                    <th>{t('home.table.updatedOn')}</th>
                    <th>{t('home.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <ProjectRow key={p.id} project={p} viewMode={activeTab} />
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </main>

      {showModal && <CreateProjectModal onClose={() => setShowModal(false)} />}

      {toast !== null && (
        <div
          className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`}
          role="status"
        >
          {toast.type === 'error' ? '✕' : '✓'} {toast.message}
        </div>
      )}
    </div>
  );
};