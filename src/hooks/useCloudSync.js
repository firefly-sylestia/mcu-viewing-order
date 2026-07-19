import { useEffect, useRef, useCallback, useState } from 'react';
import { ref, set, onValue, off } from 'firebase/database';
import { db, configured } from '../firebase';

export function useCloudSync(user, actions, profileName, setActions, setProfileName) {
  const pushTimer = useRef(null);

  // Track the last known state from the cloud to avoid echo loops
  const lastSyncedActions = useRef(null);
  const lastSyncedProfile = useRef(null);

  const [lastSynced, setLastSynced] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [conflict, setConflict] = useState(null); // { remote, local } when conflict detected

  // Keep a mutable ref of current local state for the onValue closure
  const localStateRef = useRef({ actions, profileName });
  useEffect(() => {
    localStateRef.current = { actions, profileName };
  }, [actions, profileName]);

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
      if (remoteActionsStr === syncedActionsStr && data.profileName === lastSyncedProfile.current) {
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

    set(userRef, {
      actions,
      profileName,
      lastSynced: Date.now(),
    }).then(() => {
      updateLastSynced();
    }).catch(() => {}).finally(() => setSyncing(false));

  }, [user?.uid, actions, profileName]);

  // Resolve conflict: use remote data (discard local)
  const resolveUseRemote = useCallback(() => {
    if (!conflict) return;
    setActions(conflict.remoteActions);
    if (conflict.remoteProfile) setProfileName(conflict.remoteProfile);
    lastSyncedActions.current = conflict.remoteActions;
    lastSyncedProfile.current = conflict.remoteProfile;
    setConflict(null);
  }, [conflict, setActions, setProfileName]);

  // Resolve conflict: keep local data (overwrite remote)
  const resolveKeepLocal = useCallback(() => {
    if (!conflict || !configured || !user) return;
    setSyncing(true);
    const userRef = ref(db, `users/${user.uid}`);
    lastSyncedActions.current = localStateRef.current.actions;
    lastSyncedProfile.current = localStateRef.current.profileName;
    set(userRef, {
      actions: localStateRef.current.actions,
      profileName: localStateRef.current.profileName,
      lastSynced: Date.now(),
    }).then(() => {
      updateLastSynced();
      setConflict(null);
    }).catch(() => {
      // Keep conflict open if push fails
    }).finally(() => setSyncing(false));
  }, [conflict, user, configured, updateLastSynced]);

  // Listen for local changes to trigger debounce push
  useEffect(() => {
    if (!configured || !user) return;

    const currentActionsStr = JSON.stringify(actions || {});
    const syncedActionsStr = JSON.stringify(lastSyncedActions.current || {});

    const changed = currentActionsStr !== syncedActionsStr || profileName !== lastSyncedProfile.current;

    if (!changed) return;

    window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(pushToCloud, 5000);

    return () => window.clearTimeout(pushTimer.current);
  }, [actions, profileName, user?.uid, pushToCloud]);

  // Push on logout (always immediate, no conflict check needed)
  const pushBeforeLogout = useCallback(() => {
    if (!configured || !user) return Promise.resolve();
    const userRef = ref(db, `users/${user.uid}`);
    return set(userRef, { actions, profileName, lastSynced: Date.now() }).then(updateLastSynced);
  }, [user?.uid, actions, profileName]);

  return {
    pushToCloud,
    pushBeforeLogout,
    lastSynced,
    syncing,
    conflict,
    resolveUseRemote,
    resolveKeepLocal,
  };
}
