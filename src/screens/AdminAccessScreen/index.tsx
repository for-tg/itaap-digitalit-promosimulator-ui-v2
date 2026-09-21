import { useCallback, useEffect, useRef, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { LanguageSelector } from '~/components/Layout/LanguageSelector';
import { useTheme } from '~/contexts/ThemeContext';
import {
  approveAccessRequest,
  fetchAdminRequests,
  getRbacErrorMessage,
  rejectAccessRequest,
} from '~/services/rbacService';
import type { AdminAccessRequest } from '~/types/rbac';
import { hasAdminRole } from '~/utils/authRoles';
import { appConfigs } from '~/utils/appConfig';
import rgmPhcatLogo from '~/assets/images/rgm_phcat_logo.png';
import philipsLogo from '~/assets/images/LOGO_PHILIPS.png';

import styles from '../rbacStyles.module.css';

type AdminTab = 'pending' | 'approved' | 'rejected';

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const AdminAccessScreen = () => {
  const { t } = useTranslation();
  const { instance, accounts } = useMsal();
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('pending');
  const [pendingRequests, setPendingRequests] = useState<AdminAccessRequest[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<AdminAccessRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<AdminAccessRequest[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeAccount = instance.getActiveAccount() ?? accounts[0] ?? null;
  const isAdmin = hasAdminRole(activeAccount);

  const displayName =
    activeAccount?.name ?? activeAccount?.username ?? t('common.defaultUser');

  const initials = displayName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ message, type });
      toastTimer.current = setTimeout(() => setToast(null), 3000);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    setError(null);
    try {
      const [pending, approved, rejected] = await Promise.all([
        fetchAdminRequests('pending'),
        fetchAdminRequests('approved'),
        fetchAdminRequests('rejected'),
      ]);
      setPendingRequests(pending);
      setApprovedRequests(approved);
      setRejectedRequests(rejected);
    } catch (err) {
      setError(getRbacErrorMessage(err, t('access.admin.loadFailed')));
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, t]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const handleApprove = async (accessId: number) => {
    setActionId(String(accessId));
    try {
      await approveAccessRequest(accessId);
      const [pending, approved] = await Promise.all([
        fetchAdminRequests('pending'),
        fetchAdminRequests('approved'),
      ]);
      setPendingRequests(pending);
      setApprovedRequests(approved);
      showToast(t('access.admin.requestApproved'));
    } catch (err) {
      showToast(getRbacErrorMessage(err, t('access.admin.approveFailed')), 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (accessId: number) => {
    setActionId(String(accessId));
    try {
      await rejectAccessRequest(accessId);
      const [pending, rejected] = await Promise.all([
        fetchAdminRequests('pending'),
        fetchAdminRequests('rejected'),
      ]);
      setPendingRequests(pending);
      setRejectedRequests(rejected);
      showToast(t('access.admin.requestRejected'));
    } catch (err) {
      showToast(getRbacErrorMessage(err, t('access.admin.rejectFailed')), 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleSignOut = () => {
    if (appConfigs.ENABLE_SSO) void instance.logoutRedirect();
  };

  if (!isAdmin) {
    return (
      <div className={styles.shell}>
        <main className={styles.main}>
          <div className={styles.errorState}>
            <h2>{t('access.admin.accessDenied')}</h2>
            <p>{t('access.admin.notAuthorized')}</p>
            <button className={styles.primaryBtn} onClick={() => navigate('/')}>
              {t('access.admin.backToHome')}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
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

        <button className="icon-btn" onClick={() => navigate('/')}>
          {t('access.page.home')}
        </button>

        <img className={styles.logoPhilips} src={philipsLogo} alt="Philips" />

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

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <h1>{t('access.admin.title')}</h1>
            <p>{t('access.admin.description')}</p>
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'pending' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            {t('access.admin.pendingRequests', { count: pendingRequests.length })}
          </button>

          <button
            className={`${styles.tab} ${activeTab === 'approved' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            {t('access.admin.approvedRequests', { count: approvedRequests.length })}
          </button>

          <button
            className={`${styles.tab} ${activeTab === 'rejected' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            {t('access.admin.rejectedRequests', { count: rejectedRequests.length })}
          </button>
        </div>

        {isLoading && (
          <div className={styles.empty}>{t('access.admin.loading')}</div>
        )}

        {!isLoading && error && (
          <div className={styles.errorState}>
            <p>{error}</p>
            <button
              className={styles.primaryBtn}
              onClick={() => void loadAdminData()}
            >
              {t('access.page.retry')}
            </button>
          </div>
        )}

        {/* Pending */}
        {!isLoading && !error && activeTab === 'pending' && (
          <>
            {pendingRequests.length === 0 ? (
              <div className={styles.empty}>{t('access.admin.noPendingRequests')}</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t('access.page.email')}</th>
                      <th>{t('access.form.region')}</th>
                      <th>{t('access.form.country')}</th>
                      <th>{t('filters.mag')}</th>
                      <th>{t('filters.retailer')}</th>
                      <th>{t('access.page.requestDate')}</th>
                      <th>{t('access.page.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((row) => (
                      <tr key={row.accessId}>
                        <td>{row.email}</td>
                        <td>{row.regionName}</td>
                        <td>{row.countryName || row.countryCode}</td>
                        <td>{row.magName}</td>
                        <td>{row.retailerName}</td>
                        <td>{formatDate(row.requestedOn)}</td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              className={styles.approveBtn}
                              disabled={actionId === String(row.accessId)}
                              onClick={() => void handleApprove(row.accessId)}
                            >
                              {t('access.admin.approve')}
                            </button>
                            <button
                              className={styles.rejectBtn}
                              disabled={actionId === String(row.accessId)}
                              onClick={() => void handleReject(row.accessId)}
                            >
                              {t('access.admin.reject')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Approved */}
        {!isLoading && !error && activeTab === 'approved' && (
          <>
            {approvedRequests.length === 0 ? (
              <div className={styles.empty}>{t('access.admin.noApprovedRequests')}</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t('access.page.email')}</th>
                      <th>{t('access.form.region')}</th>
                      <th>{t('access.form.country')}</th>
                      <th>{t('filters.mag')}</th>
                      <th>{t('filters.retailer')}</th>
                      <th>{t('access.admin.approvedDate')}</th>
                      <th>{t('access.admin.approvedBy')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedRequests.map((row) => (
                      <tr key={row.accessId}>
                        <td>{row.email}</td>
                        <td>{row.regionName}</td>
                        <td>{row.countryName || row.countryCode}</td>
                        <td>{row.magName}</td>
                        <td>{row.retailerName}</td>
                        <td>{formatDate(row.approvedOn)}</td>
                        <td>{row.approvedBy || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Rejected */}
        {!isLoading && !error && activeTab === 'rejected' && (
          <>
            {rejectedRequests.length === 0 ? (
              <div className={styles.empty}>{t('access.admin.noRejectedRequests')}</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t('access.page.email')}</th>
                      <th>{t('access.form.region')}</th>
                      <th>{t('access.form.country')}</th>
                      <th>{t('filters.mag')}</th>
                      <th>{t('filters.retailer')}</th>
                      <th>{t('access.page.requestDate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejectedRequests.map((row) => (
                      <tr key={row.accessId}>
                        <td>{row.email}</td>
                        <td>{row.regionName}</td>
                        <td>{row.countryName || row.countryCode}</td>
                        <td>{row.magName}</td>
                        <td>{row.retailerName}</td>
                        <td>{formatDate(row.requestedOn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === 'error' ? styles.toastError : ''
          }`}
          role="status"
        >
          {toast.type === 'error' ? '✕' : '✓'} {toast.message}
        </div>
      )}
    </div>
  );
};
