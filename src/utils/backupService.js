export const BACKUP_SCHEMA_VERSION = 2;
export const AUTO_BACKUP_KEY = 'mcu-auto-backups-v2';
export const LEGACY_AUTO_BACKUP_KEY = 'mcu-auto-backup-v1';
export const LEGACY_AUTO_BACKUP_TS_KEY = 'mcu-auto-backup-ts-v1';
const MAX_SNAPSHOTS = 5;

export function createProgressPayload({ items, actions, profile, exportPrefs }) {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    items: items.map(({ id, status, watchedDate, statusChangedAt }) => ({ id, status, watchedDate, statusChangedAt })),
    actions,
    profile,
    exportPrefs,
  };
}

export function parseBackupSnapshots(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function appendSnapshot(existingSnapshots, snapshot) {
  const merged = [snapshot, ...existingSnapshots].slice(0, MAX_SNAPSHOTS);
  return merged;
}

export function buildBackupPreview(snapshot) {
  const watched = Array.isArray(snapshot?.items) ? snapshot.items.filter(item => item?.status === 'watched').length : 0;
  return {
    exportedAt: snapshot?.exportedAt || '',
    watched,
    total: Array.isArray(snapshot?.items) ? snapshot.items.length : 0,
  };
}
