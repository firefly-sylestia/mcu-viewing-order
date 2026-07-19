import { useEffect, useRef, useCallback, useState } from 'react';
import { ref, set, get, onValue, off } from 'firebase/database';
import { db, configured } from '../firebase';

export function useCloudSync(user, actions, profileName, setActions, setProfileName, setWatchItem) {
  const pushTimer = useRef(null);
  const lastActions = useRef(null);
  const lastProfile = useRef(null);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const updateLastSynced = () => {
    const now = Date.now();
    setLastSynced(now);
  };

  // Pull data from cloud on login
  useEffect(() => {
    if (!configured || !user) return;
    const userRef = ref(db, `users/${user.uid}`);
    setSyncing(true);
    get(userRef).then(snapshot => {
      const data = snapshot.val();
      if (!data) return;
      if (data.actions) {
        setActions(prev => ({ ...data.actions, ...prev }));
        lastActions.current = data.actions;
      }
      if (data.profileName && !profileName) {
        setProfileName(data.profileName);
        lastProfile.current = data.profileName;
      }
      updateLastSynced();
    }).catch(() => {}).finally(() => setSyncing(false));
  }, [user?.uid]);

  // Listen for remote changes while logged in
  useEffect(() => {
    if (!configured || !user) return;
    const userRef = ref(db, `users/${user.uid}`);
    const handle = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      if (data.actions) {
        setActions(prev => ({ ...data.actions, ...prev }));
        lastActions.current = data.actions;
      }
      if (data.profileName) {
        setProfileName(data.profileName);
        lastProfile.current = data.profileName;
      }
      updateLastSynced();
    });
    return () => off(userRef, 'value', handle);
  }, [user?.uid]);

  // Push local changes to cloud (debounced)
  const pushToCloud = useCallback(() => {
    if (!configured || !user) return;
    setSyncing(true);
    const userRef = ref(db, `users/${user.uid}`);
    set(userRef, {
      actions,
      profileName,
      lastSynced: Date.now(),
    }).then(updateLastSynced).catch(() => {}).finally(() => setSyncing(false));
    lastActions.current = actions;
    lastProfile.current = profileName;
  }, [user?.uid, actions, profileName]);

  useEffect(() => {
    if (!configured || !user) return;
    const changed = JSON.stringify(actions) !== JSON.stringify(lastActions.current)
      || profileName !== lastProfile.current;
    if (!changed) return;
    window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(pushToCloud, 2000);
    return () => window.clearTimeout(pushTimer.current);
  }, [actions, profileName, user?.uid]);

  // Push on logout
  const pushBeforeLogout = useCallback(() => {
    if (!configured || !user) return Promise.resolve();
    const userRef = ref(db, `users/${user.uid}`);
    return set(userRef, { actions, profileName, lastSynced: Date.now() }).then(updateLastSynced);
  }, [user?.uid, actions, profileName]);

  return { pushToCloud, pushBeforeLogout, lastSynced, syncing };
}
