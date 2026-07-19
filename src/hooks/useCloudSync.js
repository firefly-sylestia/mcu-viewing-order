import { useEffect, useRef, useCallback, useState } from 'react';
import { ref, set, onValue, off } from 'firebase/database';
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

  // Keep a mutable ref of current local state for the onValue closure
  const localStateRef = useRef({ actions, profileName, watchItem });
  useEffect(() => {
    localStateRef.current = { actions, profileName, watchItem };
  }, [actions, profileName, watchItem]);

  const updateLastSynced = () => {
    setLastSynced(Date.now());
  };

  // Pull data on login and listen for remote changes
  useEffect(() => {
    if (!configured || !user) return;
    const userRef = ref(db, `users/${user.uid}`);
    setSyncing(true);

    let firstMerge = true;
    const handle = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (firstMerge) { firstMerge = false; setSyncing(false); }
      if (!data) return;

      const remoteActionsStr = JSON.stringify(data.actions || {});
      const syncedActionsStr = JSON.stringify(lastSyncedActions.current || {});

      // If remote matches our last known synced state, this is an echo of our own push — ignore
      const remoteWatchStr = JSON.stringify(data.watchItem || null);
      const syncedWatchStr = JSON.stringify(lastSyncedWatchItem.current || null);
      if (remoteActionsStr === syncedActionsStr && data.profileName === lastSyncedProfile.current && remoteWatchStr === syncedWatchStr) {
        return;
      }

      const localActionsStr = JSON.stringify(localStateRef.current.actions || {});

      // Check if local has unsynced changes that differ from remote → conflict
      const localDiffersFromSynced = syncedActionsStr !== localActionsStr;
      const remoteDiffersFromLocal = remoteActionsStr !== localActionsStr;

      if (localDiffersFromSynced && remoteDiffersFromLocal) {
        // Conflict: both local and remote changed since last sync
        setConflict({
          remoteActions: data.actions || {},
          remoteProfile: data.profileName || '',
          remoteWatchItem: data.watchItem || null,
        });
        return; // Don't auto-merge — let user resolve
      }

      // No conflict: apply remote changes
      if (data.actions && remoteActionsStr !== localActionsStr) {
        setActions(prev => {
          const merged = { ...prev, ...data.actions };
          lastSyncedActions.current = merged;
          return merged;
        });
      }

      if (data.profileName && data.profileName !== localStateRef.current.profileName) {
        setProfileName(data.profileName);
        lastSyncedProfile.current = data.profileName;
      }

      if (data.watchItem && JSON.stringify(data.watchItem) !== JSON.stringify(localStateRef.current.watchItem)) {
        setWatchItem(data.watchItem);
        lastSyncedWatchItem.current = data.watchItem;
      }

      if (data.lastSynced) {
        setLastSynced(data.lastSynced);
      }
    });

    return () => off(userRef, 'value', handle);
  }, [user?.uid]);

  // Push local changes to cloud (debounced)
  const pushToCloud = useCallback(() => {
    if (!configured || !user) return;

    setSyncing(true);
    const userRef = ref(db, `users/${user.uid}`);

    // Update refs BEFORE pushing so the upcoming onValue echo is ignored
    lastSyncedActions.current = actions;
    lastSyncedProfile.current = profileName;
    lastSyncedWatchItem.current = watchItem;

    set(userRef, {
      actions,
      profileName,
      watchItem,
      lastSynced: Date.now(),
    }).then(() => {
      updateLastSynced();
      setToast({ message: 'Synced successfully', type: 'success' });
    }).catch(() => {
      setToast({ message: 'Sync failed — check connection', type: 'error' });
    }).finally(() => setSyncing(false));

  }, [user?.uid, actions, profileName, watchItem]);

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
