export const APP_PAGES = {
  DASHBOARD: 'Dashboard',
  FIELDS: 'Fields',
  WORKSPACE: 'Workspace',
  ANALYSIS_RESULTS: 'Analysis Results',
  FIELD_SHARING: 'Field Sharing',
  ADMIN_PANEL: 'Admin Panel',
  SETTINGS: 'Settings'
};

const LEGACY_PAGE_ALIASES = {
  Home: APP_PAGES.DASHBOARD,
  Profile: APP_PAGES.SETTINGS,
  Admin: APP_PAGES.ADMIN_PANEL,
  'Field Access': APP_PAGES.FIELD_SHARING,
  'Analysis Report': APP_PAGES.ANALYSIS_RESULTS,
  Reports: APP_PAGES.ANALYSIS_RESULTS,
  Projects: APP_PAGES.WORKSPACE,
  'My Farm': APP_PAGES.FIELDS
};

export const normalizeAppPage = (page) => LEGACY_PAGE_ALIASES[page] || page;

export const isAdminUser = (user) => user?.role === 'ADMIN';

export const getDefaultPrivatePage = (user) => (
  isAdminUser(user) ? APP_PAGES.DASHBOARD : APP_PAGES.FIELDS
);

export const getAccessiblePage = (page, user) => {
  const normalizedPage = normalizeAppPage(page);

  if (normalizedPage === APP_PAGES.DASHBOARD && !isAdminUser(user)) {
    return APP_PAGES.FIELDS;
  }

  if (normalizedPage === APP_PAGES.ADMIN_PANEL && !isAdminUser(user)) {
    return getDefaultPrivatePage(user);
  }

  return normalizedPage;
};
