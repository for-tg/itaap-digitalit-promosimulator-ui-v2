import { useMsal } from '@azure/msal-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { LanguageSelector } from '~/components/Layout/LanguageSelector';
import { useTheme } from '~/contexts/ThemeContext';
import { fetchMyAccess } from '~/services/rbacService';
import type { Project, Scenario } from '~/types/project';
import { appConfigs } from '~/utils/appConfig';
import rgmPhcatLogo from '~/assets/images/rgm_phcat_logo.png';
import philipsLogo from '~/assets/images/LOGO_PHILIPS.png';
import { hasAdminRole } from '~/utils/authRoles';

import styles from './styles.module.css';

interface Props {
  activeProject: Project | null;
  activeScenario: Scenario | null;
}

const CZ_FLAG = (
  <svg
    width="16"
    height="11"
    viewBox="0 0 6 4"
    aria-hidden="true"
    style={{
      verticalAlign: 'middle',
      marginRight: 4,
      border: '1px solid var(--line)',
      borderRadius: 2,
    }}
  >
    <rect width="6" height="2" fill="#fff" />
    <rect y="2" width="6" height="2" fill="#d7141a" />
    <path d="M0 0 L3 2 L0 4 Z" fill="#11457e" />
  </svg>
);

/**
 * Application top navigation bar.
 * Shows the Philips / RGM brand, optional project context pills, theme toggle,
 * and a sign-out action.
 */
export const TopBar = ({ activeProject, activeScenario }: Props) => {
  const { t } = useTranslation();
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { instance, accounts } = useMsal();
  const [hasRequestedAccess, setHasRequestedAccess] = useState(false);

  // Resolve the currently logged-in user from MSAL
  const activeAccount = instance.getActiveAccount() ?? accounts[0] ?? null;
  const displayName = activeAccount?.name ?? activeAccount?.username ?? 'User';
  const isAdmin = hasAdminRole(activeAccount);

  // Build 1-2 letter avatar initials from the display name
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const handleHome = () => navigate('/');

  const handleSignOut = () => {
    if (appConfigs.ENABLE_SSO) {
      // Trigger Azure AD redirect logout — clears MSAL cache and Azure session
      instance.logoutRedirect().catch((error: unknown) => {
        console.error('[SSO] Logout failed:', error);
      });
    } else {
      // SSO disabled — just navigate home
      navigate('/');
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
    <header className={styles.topbar} role="banner">
      <div
        className={styles.logoCat}
        aria-label={t('app.rgmAndPhcat')}
        onClick={handleHome}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleHome()}
        title={t('app.backToProjects')}
        style={{ cursor: 'pointer' }}
      >
         <img
              className={styles.logo}
              src={rgmPhcatLogo}
              alt="RGM and PHCAT"
            />
      </div>
      <div className={styles.brand}>
        {t('app.title')}
        <small>{t('app.subtitle')}</small>
      </div>

      {activeProject && (
        <div className={styles.ctxRow} aria-label={t('app.activeProjectContext')}>
          <span className={styles.ctxPill}>
            <span className={styles.ctxKey}>{t('filters.market')}</span>
            {activeProject.market === 'CZ' && CZ_FLAG}
            {activeProject.market}
          </span>
          <span className={styles.ctxPill}>
            <span className={styles.ctxKey}>{t('filters.mag')}</span>
            {activeProject.mag}
          </span>
          <span className={styles.ctxPill}>
            <span className={styles.ctxKey}>{t('filters.retailer')}</span>
            {activeProject.retailer}
          </span>
          {activeScenario && (
            <span className={`${styles.ctxPill} ${styles.ctxPillScenario}`}>
              <span className={styles.ctxKey}>{t('filters.scenario')}</span>
              <span className={styles.ctxValue}>{activeScenario.name}</span>
            </span>
          )}
        </div>
      )}

      <div className={styles.spacer} />

      <div className={styles.logoPhilipsWrap} aria-label={t('app.philipsBrand')}>
        <img
          className={styles.logoPhilipsImg}
          src={philipsLogo}
          alt="Philips"
        />
      </div>

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

      <LanguageSelector />
      <button
        className="icon-btn"
        onClick={toggleTheme}
        aria-label={t('app.toggleColourTheme')}
      >
        ◑ {t('filters.theme')}
      </button>
      <div className={styles.user}>
        <b>{displayName}</b>
        <span className={styles.avatar} aria-hidden="true">
          {initials}
        </span>
      </div>
      <button className="icon-btn" onClick={handleSignOut}>
        {t('common.signOut')}
      </button>
    </header>
  );
};