import { getAdminPassword } from './adminSession';

export const isAdminApiAvailable = () => Boolean(getAdminPassword());

export const adminApi = async (action, { method = 'GET', body } = {}) => {
  const password = getAdminPassword();
  if (!password) throw new Error('Admin password session is missing. Please unlock the admin panel again.');

  const response = await fetch(`/api/admin?action=${encodeURIComponent(action)}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': password
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Admin API request failed.');
  }

  return payload.data;
};

