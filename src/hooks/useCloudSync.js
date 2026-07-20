import { useEffect, useRef, useCallback, useState } from 'react';
import { ref, set, get } from 'firebase/database';
import { db, configured } from '../firebase';

export function useCloudSync(user, actions, profileName, setActions, setProfileName, watchItem, setWatchItem) {
  const pushTimer = useRef(null);

  // Track the last known state from the cloud to avoid echo loops
  const lastSyncedActions = useRef(null);
  const lastSyncedProfile = useRef(null);
  const lastSyncedWatchItem = useRef(null);

  const [lastSynced, setLastSynced] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Auto-dismiss toast after 3s with proper cleanup
  useEffect(() => {
    if (!toast) return;
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(toastTimer.current);
  }, [toast]);

  // Keep a mutable ref of current local state for background sync writes
  const localStateRef = useRef({ actions, profileName, watchItem });
  useEffect(() => {
    localStateRef.current = { actions, profileName, watchItem };
  }, [actions, profileName, watchItem]);

  const updateLastSynced = () => {
    setLastSynced(Date.now());
  };

  // Push local changes to cloud (debounced)
  const pushToCloud = useCallback(({ silent = false } = {}) => {
    if (!configured || !user) return;

    const { actions: currentActions, profileName: currentProfileName, watchItem: currentWatchItem } = localStateRef.current;
    setSyncing(true);
    const userRef = ref(db, `users/${user.uid}`);

    lastSyncedActions.current = currentActions;
    lastSyncedProfile.current = currentProfileName;
    lastSyncedWatchItem.current = currentWatchItem;

    set(userRef, {
      actions: currentActions,
      profileName: currentProfileName,
      watchItem: currentWatchItem,
      lastSynced: Date.now(),
    }).then(() => {
      updateLastSynced();
      if (!silent) setToast({ message: 'Synced successfully', type: 'success' });
    }).catch(() => {
      setToast({ message: 'Sync failed — check connection', type: 'error' });
    }).finally(() => setSyncing(false));

  }, [user?.uid]);

  // Pull data once on login/site open. Do not keep a live listener; local updates push behind
  // the scenes only when tracked progress/profile/watch state changes.
  useEffect(() => {
    if (!configured || !user) return;
    const userRef = ref(db, `users/${user.uid}`);
    let cancelled = false;
    setSyncing(true);

    get(userRef).then((snapshot) => {
      if (cancelled) return;
      const data = snapshot.val();

      if (!data) {
        lastSyncedActions.current = localStateRef.current.actions;
        lastSyncedProfile.current = localStateRef.current.profileName;
        lastSyncedWatchItem.current = localStateRef.current.watchItem;
        pushToCloud({ silent: true });
        return;
      }

      const remoteActions = data.actions || {};
      const remoteProfile = data.profileName || '';
      const remoteWatchItem = data.watchItem || null;

      lastSyncedActions.current = remoteActions;
      lastSyncedProfile.current = remoteProfile;
      lastSyncedWatchItem.current = remoteWatchItem;

      setActions(remoteActions);
      if (remoteProfile) setProfileName(remoteProfile);
      if (remoteWatchItem) setWatchItem(remoteWatchItem);
      if (data.lastSynced) setLastSynced(data.lastSynced);
    }).catch(() => {
      if (!cancelled) setToast({ message: 'Cloud sync unavailable — changes stay local', type: 'error' });
    }).finally(() => {
      if (!cancelled) setSyncing(false);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(pushTimer.current);
    };
  }, [user?.uid, pushToCloud, setActions, setProfileName, setWatchItem]);

  // Resolve conflict: use remote data (discard local)
  const resolveUseRemote = useCallback(() => {
    if (!conflict) return;
    setActions(conflict.remoteActions);
    if (conflict.remoteProfile) setProfileName(conflict.remoteProfile);
    if (conflict.remoteWatchItem !== undefined) setWatchItem(conflict.remoteWatchItem);
    lastSyncedActions.current = conflict.remoteActions;
    lastSyncedProfile.current = conflict.remoteProfile;
    lastSyncedWatchItem.current = conflict.remoteWatchItem;
    setConflict(null);
    setToast({ message: 'Synced from cloud', type: 'success' });
  }, [conflict, setActions, setProfileName]);

  // Resolve conflict: keep local data (overwrite remote)
  const resolveKeepLocal = useCallback(() => {
    if (!conflict || !configured || !user) return;
    setSyncing(true);
    const userRef = ref(db, `users/${user.uid}`);
    lastSyncedActions.current = localStateRef.current.actions;
    lastSyncedProfile.current = localStateRef.current.profileName;
    lastSyncedWatchItem.current = localStateRef.current.watchItem;
    set(userRef, {
      actions: localStateRef.current.actions,
      profileName: localStateRef.current.profileName,
      watchItem: localStateRef.current.watchItem,
      lastSynced: Date.now(),
    }).then(() => {
      updateLastSynced();
      setConflict(null);
      setToast({ message: 'Local data kept — synced', type: 'success' });
    }).catch(() => {
      setToast({ message: 'Push failed — try again', type: 'error' });
    }).finally(() => setSyncing(false));
  }, [conflict, user, configured, updateLastSynced]);

  // Listen for local changes to trigger debounce push
  useEffect(() => {
    if (!configured || !user) return;

    const currentActionsStr = JSON.stringify(actions || {});
    const syncedActionsStr = JSON.stringify(lastSyncedActions.current || {});
    const currentWatchStr = JSON.stringify(watchItem || null);
    const syncedWatchStr = JSON.stringify(lastSyncedWatchItem.current || null);

    const changed = currentActionsStr !== syncedActionsStr
      || profileName !== lastSyncedProfile.current
      || currentWatchStr !== syncedWatchStr;

    if (!changed) return;

    window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(pushToCloud, 5000);

    return () => window.clearTimeout(pushTimer.current);
  }, [actions, profileName, watchItem, user?.uid, pushToCloud]);

  // Push on logout (always immediate, no conflict check needed)
  const pushBeforeLogout = useCallback(() => {
    if (!configured || !user) return Promise.resolve();
    const userRef = ref(db, `users/${user.uid}`);
    lastSyncedActions.current = actions;
    lastSyncedProfile.current = profileName;
    lastSyncedWatchItem.current = watchItem;
    return set(userRef, { actions, profileName, watchItem, lastSynced: Date.now() }).then(updateLastSynced);
  }, [user?.uid, actions, profileName, watchItem]);

  return {
    pushToCloud,
    pushBeforeLogout,
    lastSynced,
    syncing,
    conflict,
    resolveUseRemote,
    resolveKeepLocal,
    toast,
  };
}
