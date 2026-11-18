const STORAGE_KEY = 'incursion-temporary-visitor-v1';

const randomHex = (byteLength = 32) => {
  const bytes = new Uint8Array(byteLength);
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure random generation is unavailable.');
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
};

export function getOrCreateTemporaryVisitor() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved?.id && saved?.token && /^[0-9a-f]{64}$/i.test(saved.token)) return saved;
  } catch {}

  const identity = {
    id: globalThis.crypto?.randomUUID?.() || [
      randomHex(4), randomHex(2), randomHex(2), randomHex(2), randomHex(6)
    ].join('-'),
    token: randomHex(32),
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(identity)); } catch {}
  return identity;
}
