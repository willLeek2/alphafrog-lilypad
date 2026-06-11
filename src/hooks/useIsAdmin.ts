import { useSyncExternalStore } from 'react';
import { loadAdminAuth } from '../utils/storage';

const AUTH_CHANGE_EVENT = 'alphafrog-auth-changed';

/**
 * Returns true iff an admin session is currently active in localStorage.
 * Subscribes to the custom `alphafrog-auth-changed` event (storage events do
 * not fire in the tab that wrote the value) so the badge/links re-render when
 * admin logs in or out.
 */
export function useIsAdmin(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const handler = () => onChange();
      window.addEventListener(AUTH_CHANGE_EVENT, handler);
      // Also listen to cross-tab storage events so multi-tab logout still works.
      const storageHandler = (e: StorageEvent) => {
        if (e.key === 'alphafrog.admin.auth') {
          onChange();
        }
      };
      window.addEventListener('storage', storageHandler);
      return () => {
        window.removeEventListener(AUTH_CHANGE_EVENT, handler);
        window.removeEventListener('storage', storageHandler);
      };
    },
    () => loadAdminAuth() !== null,
    () => false
  );
}
