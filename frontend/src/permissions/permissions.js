export const USER_ROLES = {
  ADMIN: 'ADMIN',
  FARMER: 'FARMER',
  AGRONOMIST: 'AGRONOMIST'
};

export const FIELD_ROLES = {
  OWNER: 'OWNER',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER'
};

export const isAdmin = (user) => user?.role === USER_ROLES.ADMIN;
export const isFarmer = (user) => user?.role === USER_ROLES.FARMER;
export const isAgronomist = (user) => user?.role === USER_ROLES.AGRONOMIST;

export const getFieldPermissions = (field, user) => {
  if (isAdmin(user)) {
    return {
      canView: true,
      canCreateField: true,
      canEditField: true,
      canDeleteField: true,
      canAnalyze: true,
      canShare: true,
      canManageTeam: true,
      canComment: true,
      canWriteReport: true
    };
  }

  const role = field?.role;

  return {
    canView: Boolean(role),
    canCreateField: isFarmer(user),
    canEditField: role === FIELD_ROLES.OWNER || role === FIELD_ROLES.EDITOR,
    canDeleteField: role === FIELD_ROLES.OWNER,
    canAnalyze: role === FIELD_ROLES.OWNER || role === FIELD_ROLES.EDITOR,
    canShare: role === FIELD_ROLES.OWNER,
    canManageTeam: role === FIELD_ROLES.OWNER,
    canComment: role === FIELD_ROLES.OWNER || role === FIELD_ROLES.EDITOR,
    canWriteReport: isAgronomist(user) && (role === FIELD_ROLES.EDITOR || role === FIELD_ROLES.OWNER)
  };
};
