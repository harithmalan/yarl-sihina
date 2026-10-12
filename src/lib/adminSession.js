const ADMIN_SESSION_KEY = 'yarl_admin_session';
const ADMIN_PASSWORD_KEY = 'yarl_admin_password';

export const getAdminPassword = () => {
  try {
    return sessionStorage.getItem(ADMIN_PASSWORD_KEY) || '';
  } catch {
    return '';
  }
};

export const grantAdminSession = (password) => {
  sessionStorage.setItem(ADMIN_SESSION_KEY, 'granted');
  sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
};

export const clearAdminSession = () => {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
};

export const hasAdminSession = () => {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'granted';
};

