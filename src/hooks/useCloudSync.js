import { useEffect, useRef, useCallback, useState } from 'react';
import { configured, supabaseDataRequest } from '../supabase';

const TABLE = '/rest/v1/user_data';
const encode = (value) => JSON.stringify(value ?? null);

export function useCloudSync(user, actions, profileName, setActions, setProfileName, watchItem, setWatchItem) {
  const pushTimer = useRef(null);
  const pollTimer = useRef(null);
  const lastSyncedState = useRef(null);
  const lastRemoteUpdatedAt = useRef(null);
  const localStateRef = useRef({ actions, profileName, watchItem });
  const applyingRemote = useRef(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { localStateRef.current = { actions, profileName, watchItem }; }, [actions, profileName, watchItem]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const snapshot = useCallback(() => ({
    actions: localStateRef.current.actions || {},
    profileName: localStateRef.current.profileName || '',
    watchItem: localStateRef.current.watchItem ?? null,
  }), []);

  const markSynced = useCallback((state, updatedAt) => {
    lastSyncedState.current = state;
    lastRemoteUpdatedAt.current = updatedAt || null;
    setLastSynced(Date.now());
  }, []);

  const fetchRemote = useCallback(async () => {
    if (!configured || !user?.id) return null;
    const rows = await supabaseDataRequest(
      `${TABLE}?user_id=eq.${encodeURIComponent(user.id)}&select=data,updated_at&limit=1`,
    );
    return rows?.[0] || null;
  }, [user?.id]);

  const applyRemote = useCallback((row) => {
    const data = row?.data || {};
    const next = { actions: data.actions || {}, profileName: data.profileName || '', watchItem: data.watchItem ?? null };
    applyingRemote.current = true;
    setActions(next.actions); setProfileName(next.profileName); setWatchItem(next.watchItem);
    markSynced(next, row?.updated_at);
    window.setTimeout(() => { applyingRemote.current = false; }, 0);
  }, [setActions, setProfileName, setWatchItem, markSynced]);

  const pushToCloud = useCallback(async ({ silent = false, force = false } = {}) => {
    if (!configured || !user?.id) return;
    const current = snapshot();
    setSyncing(true);
    try {
      // Optimistic concurrency check: never silently overwrite a newer device snapshot.
      if (!force && lastRemoteUpdatedAt.current) {
        const remote = await fetchRemote();
        if (remote?.updated_at !== lastRemoteUpdatedAt.current) {
          if (remote) setConflict({
            remoteActions: remote.data?.actions || {},
            remoteProfile: remote.data?.profileName || '',
            remoteWatchItem: remote.data?.watchItem ?? null,
            remoteUpdatedAt: remote.updated_at,
          });
          setToast({ message: 'Another device has newer changes. Resolve the sync conflict first.', type: 'error' });
          return;
        }
      }
      const rows = await supabaseDataRequest(`${TABLE}?on_conflict=user_id`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ user_id: user.id, data: current }),
      });
      markSynced(current, rows?.[0]?.updated_at || new Date().toISOString());
      setConflict(null);
      if (!silent) setToast({ message: 'Synced successfully', type: 'success' });
    } catch (error) {
      setToast({ message: error.message || 'Sync failed — check your connection', type: 'error' });
    } finally { setSyncing(false); }
  }, [user?.id, snapshot, markSynced, fetchRemote]);

  useEffect(() => {
    if (!configured || !user?.id) {
      lastSyncedState.current = null; lastRemoteUpdatedAt.current = null;
      setLastSynced(null); setConflict(null);
      return undefined;
    }
    let cancelled = false;
    setSyncing(true);
    const pull = async () => {
      try {
        const row = await fetchRemote();
        if (cancelled) return;
        if (!row) {
          markSynced(snapshot(), null);
          await pushToCloud({ silent: true });
        } else applyRemote(row);
      } catch (error) {
        if (!cancelled) setToast({ message: error.message || 'Cloud sync unavailable — changes remain on this device', type: 'error' });
      } finally { if (!cancelled) setSyncing(false); }
    };
    pull();

    // Periodically check for updates from the same account on other devices.
    pollTimer.current = window.setInterval(async () => {
      try {
        const row = await fetchRemote();
        if (cancelled || !row || row.updated_at === lastRemoteUpdatedAt.current) return;
        const local = snapshot();
        const dirty = lastSyncedState.current && encode(local) !== encode(lastSyncedState.current);
        if (dirty) {
          setConflict({
            remoteActions: row.data?.actions || {},
            remoteProfile: row.data?.profileName || '',
            remoteWatchItem: row.data?.watchItem ?? null,
            remoteUpdatedAt: row.updated_at,
          });
        } else applyRemote(row);
      } catch { /* Retry on the next poll; offline changes stay on this device. */ }
    }, 25_000);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer.current);
      window.clearTimeout(pushTimer.current);
    };
  }, [user?.id, fetchRemote, pushToCloud, applyRemote, markSynced, snapshot]);

  useEffect(() => {
    if (!configured || !user?.id || applyingRemote.current || !lastSyncedState.current) return undefined;
    const current = snapshot();
    if (encode(current) === encode(lastSyncedState.current)) return undefined;
    window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(() => pushToCloud(), 1800);
    return () => window.clearTimeout(pushTimer.current);
  }, [actions, profileName, watchItem, user?.id, snapshot, pushToCloud]);

  const resolveUseRemote = useCallback(() => {
    if (!conflict) return;
    applyRemote({ data: { actions: conflict.remoteActions, profileName: conflict.remoteProfile, watchItem: conflict.remoteWatchItem }, updated_at: conflict.remoteUpdatedAt });
    setConflict(null);
    setToast({ message: 'Loaded the latest cloud data', type: 'success' });
  }, [conflict, applyRemote]);

  const resolveKeepLocal = useCallback(async () => {
    if (!conflict) return;
    await pushToCloud({ force: true });
    setConflict(null);
  }, [conflict, pushToCloud]);

  const pushBeforeLogout = useCallback(async () => {
    if (!configured || !user?.id) return;
    window.clearTimeout(pushTimer.current);
    const current = snapshot();
    const rows = await supabaseDataRequest(`${TABLE}?on_conflict=user_id`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ user_id: user.id, data: current }),
    });
    markSynced(current, rows?.[0]?.updated_at || new Date().toISOString());
  }, [user?.id, snapshot, markSynced]);

  return { pushToCloud, pushBeforeLogout, lastSynced, syncing, conflict, resolveUseRemote, resolveKeepLocal, toast };
}
