export const APP_PAGES = {
  DASHBOARD: 'Dashboard',
  FIELDS: 'Fields',
  WORKSPACE: 'Workspace',
  ANALYSIS_RESULTS: 'Analysis Results',
  FIELD_SHARING: 'Field Sharing',
  ADMIN_PANEL: 'Admin Panel',
  SETTINGS: 'Settings'
};

export const normalizeAppPage = (page) => page;

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
