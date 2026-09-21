import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { LanguageSelector } from '~/components/Layout/LanguageSelector';
import { useTheme } from '~/contexts/ThemeContext';
import {
  createAccessRequest,
  fetchAccessOptions,
  fetchMyAccess,
  getRbacErrorMessage,
} from '~/services/rbacService';
import type {
  AccessOptionsRegion,
  MyAccessResponse,
} from '~/types/rbac';
import { hasAdminRole } from '~/utils/authRoles';
import { appConfigs } from '~/utils/appConfig';
import rgmPhcatLogo from '~/assets/images/rgm_phcat_logo.png';
import philipsLogo from '~/assets/images/LOGO_PHILIPS.png';

import styles from '../rbacStyles.module.css';

type ViewMode = 'landing' | 'requests';
type RequestDropdown = 'region' | 'country' | 'mag' | 'retailer' | null;

type RetailerOption = {
  retailerName: string;
  disabled: boolean;
  isAllOption?: boolean;
  accessStatus?: 'approved' | 'pending' | 'rejected' | null;
};

const normalize = (value: string): string => value.trim().toLowerCase();

export const AccessScreen = () => {
  const { t } = useTranslation();
  const { instance, accounts } = useMsal();
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [accessOptions, setAccessOptions] = useState<AccessOptionsRegion[]>([]);
  const [myAccess, setMyAccess] = useState<MyAccessResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('landing');

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<RequestDropdown>(null);
  const [selectedRegionName, setSelectedRegionName] = useState<string | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedMagName, setSelectedMagName] = useState<string | null>(null);
  const [selectedRetailerNames, setSelectedRetailerNames] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [optionsRes, accessRes] = await Promise.all([
        fetchAccessOptions(),
        fetchMyAccess(),
      ]);
      setAccessOptions(optionsRes);
      setMyAccess(accessRes);
      const hasRequests = accessRes.access.regions.some((r) =>
        r.countries.some((c) => c.mags.some((m) => m.retailers.length > 0)),
      );
      setViewMode(hasRequests ? 'requests' : 'landing');
    } catch (err) {
      setError(getRbacErrorMessage(err, t('access.request.loadFailed')));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetRequestForm = () => {
    setOpenDropdown(null);
    setSelectedRegionName(null);
    setSelectedCountryCode(null);
    setSelectedMagName(null);
    setSelectedRetailerNames([]);
  };

  const openRequestModal = () => {
    resetRequestForm();
    setIsRequestModalOpen(true);
  };

  const closeRequestModal = () => {
    setIsRequestModalOpen(false);
    resetRequestForm();
  };

  // ── Cascading dropdown options (derived from the options hierarchy) ──────────

  const countryOptions = useMemo(() => {
    const region = accessOptions.find((r) => r.regionName === selectedRegionName);
    return region?.countries ?? [];
  }, [accessOptions, selectedRegionName]);

  const magOptions = useMemo(() => {
    const country = countryOptions.find((c) => c.countryCode === selectedCountryCode);
    return country?.mags.map((m) => m.magName) ?? [];
  }, [countryOptions, selectedCountryCode]);

  const retailerBaseOptions = useMemo(() => {
    const country = countryOptions.find((c) => c.countryCode === selectedCountryCode);
    const mag = country?.mags.find((m) => m.magName === selectedMagName);
    return mag?.retailers ?? [];
  }, [countryOptions, selectedCountryCode, selectedMagName]);

  const getRetailerAccessStatus = useCallback(
    (retailerName: string): 'approved' | 'pending' | 'rejected' | null => {
      if (!myAccess || !selectedRegionName || !selectedCountryCode || !selectedMagName) {
        return null;
      }

      const statuses = myAccess.access.regions
        .filter((region) => normalize(region.regionName) === normalize(selectedRegionName))
        .flatMap((region) => region.countries)
        .filter((country) => normalize(country.countryCode) === normalize(selectedCountryCode))
        .flatMap((country) => country.mags)
        .filter((mag) => normalize(mag.magName) === normalize(selectedMagName))
        .flatMap((mag) => mag.retailers)
        .filter((retailer) => normalize(retailer.name) === normalize(retailerName))
        .map((retailer) => normalize(retailer.status));

      if (statuses.includes('approved')) return 'approved';
      if (statuses.includes('pending')) return 'pending';
      if (statuses.includes('rejected')) return 'rejected';
      return null;
    },
    [myAccess, selectedRegionName, selectedCountryCode, selectedMagName],
  );

  const retailerOptions = useMemo<RetailerOption[]>(() => {
    const options = retailerBaseOptions.map((retailer) => {
      const accessStatus = getRetailerAccessStatus(retailer.retailerName);
      return {
        retailerName: retailer.retailerName,
        disabled: accessStatus === 'approved' || accessStatus === 'pending',
        accessStatus,
      };
    });

    const selectable = options.filter(
      (o) => !o.disabled && normalize(o.retailerName) !== 'all',
    );

    if (selectable.length > 1) {
      return [
        { retailerName: 'All', disabled: false, isAllOption: true },
        ...options,
      ];
    }

    return options;
  }, [retailerBaseOptions, getRetailerAccessStatus]);

  const handleSubmit = async () => {
    if (!selectedRegionName || !selectedCountryCode || !selectedMagName) return;

    const retailers = selectedRetailerNames.includes('All')
      ? retailerOptions
          .filter((o) => !o.disabled && !o.isAllOption)
          .map((o) => o.retailerName)
      : selectedRetailerNames;

    const eligibleRetailers = retailers.filter((retailerName) => {
      const status = getRetailerAccessStatus(retailerName);
      return status === null || status === 'rejected';
    });

    if (eligibleRetailers.length === 0) return;

    setIsSubmitting(true);
    try {
      await createAccessRequest({
        regionName: selectedRegionName,
        countryCode: selectedCountryCode,
        magName: selectedMagName,
        retailers: eligibleRetailers,
      });

      closeRequestModal();
      const updated = await fetchMyAccess();
      setMyAccess(updated);
      setViewMode('requests');
      showToast(t('access.request.submitSuccess'));
    } catch (err) {
      showToast(
        getRbacErrorMessage(
          err,
          t('access.request.submitFailed'),
          t('access.request.pendingAlreadyExists'),
        ),
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = () => {
    if (appConfigs.ENABLE_SSO) void instance.logoutRedirect();
  };

  // ── Derived display state ─────────────────────────────────────────────────

  const hasAnyApprovedAccess = useMemo(
    () =>
      myAccess?.access.regions.some((r) =>
        r.countries.some((c) =>
          c.mags.some((m) => m.retailers.some((ret) => ret.status === 'approved')),
        ),
      ) ?? false,
    [myAccess],
  );

  const hasPendingRequest = useMemo(
    () =>
      myAccess?.access.regions.some((r) =>
        r.countries.some((c) =>
          c.mags.some((m) => m.retailers.some((ret) => ret.status === 'pending')),
        ),
      ) ?? false,
    [myAccess],
  );

  const hasRequestHistory = (myAccess?.access.regions.length ?? 0) > 0;

  const flattenedRequests = useMemo(
    () =>
      (myAccess?.access.regions ?? []).flatMap((region) =>
        region.countries.flatMap((country) =>
          country.mags.flatMap((mag) =>
            mag.retailers.map((retailer) => ({
              key: `${region.regionId}-${country.countryCode}-${mag.magName}-${retailer.name}`,
              regionName: region.regionName,
              countryName: country.countryName,
              magName: mag.magName,
              retailerName: retailer.name,
              status: retailer.status,
            })),
          ),
        ),
      ),
    [myAccess],
  );

  const selectedCountryLabel = useMemo(
    () =>
      countryOptions.find((c) => c.countryCode === selectedCountryCode)?.countryName ?? '',
    [countryOptions, selectedCountryCode],
  );

  const selectRegion = (regionName: string) => {
    setSelectedRegionName(regionName);
    setSelectedCountryCode(null);
    setSelectedMagName(null);
    setSelectedRetailerNames([]);
    setOpenDropdown(null);
  };

  const selectCountry = (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    setSelectedMagName(null);
    setSelectedRetailerNames([]);
    setOpenDropdown(null);
  };

  const selectMag = (magName: string) => {
    setSelectedMagName(magName);
    setSelectedRetailerNames([]);
    setOpenDropdown(null);
  };

  const selectRetailer = (option: RetailerOption) => {
    if (option.disabled) return;
    setSelectedRetailerNames((current) => {
      if (option.isAllOption) {
        return current.includes('All') ? [] : ['All'];
      }
      const withoutAll = current.filter((v) => v !== 'All');
      return withoutAll.includes(option.retailerName)
        ? withoutAll.filter((v) => v !== option.retailerName)
        : [...withoutAll, option.retailerName];
    });
    setOpenDropdown(null);
  };

  return (
    <div className={styles.shell}>
      <header className={styles.topbar} role="banner">
        <img className={styles.logo} src={rgmPhcatLogo} alt={t('app.rgmAndPhcat')} />

        <div className={styles.brand}>
          {t('app.title')}
          <small>{t('app.subtitle')} · Philips</small>
        </div>

        <div className={styles.spacer} />

        <button className="icon-btn" onClick={() => navigate('/')}>
          {t('access.page.home')}
        </button>

        {!hasAnyApprovedAccess && (
          <button
            className="icon-btn"
            onClick={() => {
              if (hasPendingRequest || hasRequestHistory) {
                setViewMode('requests');
              } else {
                openRequestModal();
              }
            }}
          >
            {hasPendingRequest || hasRequestHistory
              ? t('access.request.viewRequest')
              : t('access.request.requestAccess')}
          </button>
        )}

        {isAdmin && (
          <button className="icon-btn" onClick={() => navigate('/admin/access')}>
            {t('app.admin')}
          </button>
        )}

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
        {isLoading && (
          <div className={styles.empty}>{t('access.page.loading')}</div>
        )}

        {!isLoading && error && (
          <div className={styles.errorState}>
            <p>{error}</p>
            <button className={styles.primaryBtn} onClick={() => void loadData()}>
              {t('access.page.retry')}
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {!hasAnyApprovedAccess && viewMode === 'landing' ? (
              <section className={styles.accessLanding}>
                <img
                  src="/shield.svg"
                  alt={t('access.page.accessRequired')}
                  className={styles.accessIllustration}
                />
                <h2>{t('access.page.accessRequired')}</h2>
                <p>{t('access.page.accessRequiredMessage')}</p>
                <button className={styles.primaryBtn} onClick={openRequestModal}>
                  {t('access.request.requestAccess')}
                </button>
              </section>
            ) : (
              <section className={styles.section}>
                <div className={styles.pageHeader}>
                  <h1>{t('access.page.accessRequests')}</h1>
                  <button className={styles.primaryBtn} onClick={openRequestModal}>
                    {t('access.request.otherAccess')}
                  </button>
                </div>

                {flattenedRequests.length === 0 ? (
                  <div className={styles.emptySmall}>
                    {t('access.page.noRequestFound')}
                  </div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>{t('access.form.region')}</th>
                          <th>{t('access.form.country')}</th>
                          <th>{t('filters.mag')}</th>
                          <th>{t('filters.retailer')}</th>
                          <th>{t('access.page.status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flattenedRequests.map((row) => (
                          <tr key={row.key}>
                            <td>{row.regionName}</td>
                            <td>{row.countryName}</td>
                            <td>{row.magName}</td>
                            <td>{row.retailerName}</td>
                            <td>
                              <span
                                className={`${styles.status} ${
                                  row.status === 'approved'
                                    ? styles.approved
                                    : row.status === 'rejected'
                                    ? styles.rejected
                                    : styles.pending
                                }`}
                              >
                                {row.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {isRequestModalOpen && (
        <div className={styles.modalBackdrop} onClick={closeRequestModal}>
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>{t('access.request.requestAccess')}</h3>
              <button
                className={styles.modalClose}
                onClick={closeRequestModal}
                aria-label={t('actions.close')}
              >
                ×
              </button>
            </div>

            <div className={styles.modalForm}>
              {/* Region */}
              <label className={styles.fieldLabel}>{t('access.form.region')}</label>
              <div className={styles.dropdownWrap}>
                <button
                  type="button"
                  className={styles.fieldSelect}
                  onClick={() =>
                    setOpenDropdown((c) => (c === 'region' ? null : 'region'))
                  }
                  aria-expanded={openDropdown === 'region'}
                >
                  <span
                    className={
                      selectedRegionName ? styles.fieldValue : styles.fieldPlaceholder
                    }
                  >
                    {selectedRegionName || t('access.form.selectRegion')}
                  </span>
                  <span className={styles.fieldChevron}>⌄</span>
                </button>

                {openDropdown === 'region' && (
                  <div className={styles.dropdownMenu}>
                    {accessOptions.map((region) => (
                      <button
                        key={region.regionName}
                        type="button"
                        className={`${styles.dropdownOption} ${
                          selectedRegionName === region.regionName
                            ? styles.dropdownOptionSelected
                            : ''
                        }`}
                        onClick={() => selectRegion(region.regionName)}
                      >
                        <span className={styles.optionCheck}>
                          {selectedRegionName === region.regionName ? '✓' : ''}
                        </span>
                        <span>{region.regionName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Country */}
              <label className={styles.fieldLabel}>{t('access.form.country')}</label>
              <div className={styles.dropdownWrap}>
                <button
                  type="button"
                  className={styles.fieldSelect}
                  disabled={!selectedRegionName}
                  onClick={() =>
                    setOpenDropdown((c) => (c === 'country' ? null : 'country'))
                  }
                  aria-expanded={openDropdown === 'country'}
                >
                  <span
                    className={
                      selectedCountryLabel ? styles.fieldValue : styles.fieldPlaceholder
                    }
                  >
                    {selectedCountryLabel || t('access.form.selectCountry')}
                  </span>
                  <span className={styles.fieldChevron}>⌄</span>
                </button>

                {openDropdown === 'country' && (
                  <div className={styles.dropdownMenu}>
                    {countryOptions.length === 0 ? (
                      <div className={styles.dropdownEmpty}>
                        {t('access.form.countryRequiresRegion')}
                      </div>
                    ) : (
                      countryOptions.map((country) => {
                        const isSelected = selectedCountryCode === country.countryCode;
                        return (
                          <button
                            key={country.countryCode}
                            type="button"
                            className={`${styles.dropdownOption} ${
                              isSelected ? styles.dropdownOptionSelected : ''
                            }`}
                            onClick={() => selectCountry(country.countryCode)}
                          >
                            <span className={styles.optionCheck}>
                              {isSelected ? '✓' : ''}
                            </span>
                            <span>{country.countryName}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* MAG */}
              <label className={styles.fieldLabel}>{t('filters.mag')}</label>
              <div className={styles.dropdownWrap}>
                <button
                  type="button"
                  className={styles.fieldSelect}
                  disabled={!selectedCountryCode}
                  onClick={() =>
                    setOpenDropdown((c) => (c === 'mag' ? null : 'mag'))
                  }
                  aria-expanded={openDropdown === 'mag'}
                >
                  <span
                    className={
                      selectedMagName ? styles.fieldValue : styles.fieldPlaceholder
                    }
                  >
                    {selectedMagName || t('access.form.selectMag')}
                  </span>
                  <span className={styles.fieldChevron}>⌄</span>
                </button>

                {openDropdown === 'mag' && (
                  <div className={styles.dropdownMenu}>
                    {magOptions.length === 0 ? (
                      <div className={styles.dropdownEmpty}>
                        {t('access.form.magRequiresCountry')}
                      </div>
                    ) : (
                      magOptions.map((mag) => (
                        <button
                          key={mag}
                          type="button"
                          className={`${styles.dropdownOption} ${
                            selectedMagName === mag ? styles.dropdownOptionSelected : ''
                          }`}
                          onClick={() => selectMag(mag)}
                        >
                          <span className={styles.optionCheck}>
                            {selectedMagName === mag ? '✓' : ''}
                          </span>
                          <span>{mag}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Retailer (multi-select) */}
              <label className={styles.fieldLabel}>{t('filters.retailer')}</label>
              <div className={styles.dropdownWrap}>
                <button
                  type="button"
                  className={styles.fieldSelect}
                  disabled={!selectedMagName}
                  onClick={() =>
                    setOpenDropdown((c) => (c === 'retailer' ? null : 'retailer'))
                  }
                  aria-expanded={openDropdown === 'retailer'}
                >
                  <span
                    className={
                      selectedRetailerNames.length > 0
                        ? styles.fieldValue
                        : styles.fieldPlaceholder
                    }
                  >
                    {selectedRetailerNames.length > 0
                      ? selectedRetailerNames.join(', ')
                      : t('access.form.selectRetailer')}
                  </span>
                  <span className={styles.fieldChevron}>⌄</span>
                </button>

                {openDropdown === 'retailer' && (
                  <div className={styles.dropdownMenu}>
                    {retailerOptions.length === 0 ? (
                      <div className={styles.dropdownEmpty}>
                        {t('access.form.retailerRequiresMAG')}
                      </div>
                    ) : (
                      retailerOptions.map((option) => {
                        const isSelected = selectedRetailerNames.includes(
                          option.retailerName,
                        );
                        return (
                          <button
                            key={option.retailerName}
                            type="button"
                            className={`${styles.dropdownOption} ${
                              isSelected ? styles.dropdownOptionSelected : ''
                            } ${option.disabled ? styles.dropdownOptionDisabled : ''}`}
                            onClick={() => selectRetailer(option)}
                            disabled={option.disabled}
                          >
                            <span className={styles.optionCheck}>
                              {isSelected ? '✓' : ''}
                            </span>
                            <span>{option.retailerName}</span>
                            {option.disabled && (
                              <small>
                                {option.accessStatus === 'pending'
                                  ? t('access.page.pending')
                                  : t('access.form.granted')}
                              </small>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <button
                className={styles.primaryBtn}
                disabled={
                  isSubmitting ||
                  !selectedRegionName ||
                  !selectedCountryCode ||
                  !selectedMagName ||
                  selectedRetailerNames.length === 0
                }
                onClick={() => void handleSubmit()}
              >
                {isSubmitting
                  ? t('access.request.submitting')
                  : t('access.request.submitRequest')}
              </button>
            </div>
          </div>
        </div>
      )}

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
