import { createHmac, randomUUID } from 'node:crypto';

const json = (res, status, payload) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(status).json(payload);
};
const base64url = value => Buffer.from(value).toString('base64url');
const signToken = (apiKey, apiSecret, claims) => {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify(claims));
  const unsigned = header + '.' + payload;
  const signature = createHmac('sha256', apiSecret).update(unsigned).digest('base64url');
  return unsigned + '.' + signature;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const code = String(body.code || '').trim().toUpperCase();
  const participantToken = String(body.participantToken || '');
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code) || !/^[a-f0-9]{64}$/i.test(participantToken)) {
    return json(res, 400, { error: 'Invalid screening room credentials.' });
  }

  const openViduUrl = String(process.env.OPENVIDU_URL || process.env.LIVEKIT_URL || '').trim().replace(/\/$/, '');
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!openViduUrl || !apiKey || !apiSecret) return json(res, 503, { error: 'OpenVidu is not configured on the server yet. Add OPENVIDU_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET in Vercel.' });
  if (!supabaseUrl || !supabaseAnonKey) return json(res, 503, { error: 'The server is missing the Supabase URL or public anon key needed to validate this room.' });

  let parsedUrl;
  try { parsedUrl = new URL(openViduUrl); } catch { return json(res, 500, { error: 'OPENVIDU_URL is not a valid WebSocket URL.' }); }
  if (!['wss:', 'ws:'].includes(parsedUrl.protocol) || (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'wss:')) {
    return json(res, 500, { error: 'Use a secure wss:// OpenVidu URL in production.' });
  }

  try {
    const verification = await fetch(supabaseUrl + '/rest/v1/rpc/watch_room_voice_access', {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, Authorization: 'Bearer ' + supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: code, p_token: participantToken }),
    });
    const member = await verification.json().catch(() => ({}));
    if (!verification.ok) {
      const message = member.message || member.msg || 'This participant is not authorized to join voice chat.';
      const status = /disabled by the host/i.test(message) ? 403 : verification.status === 404 ? 404 : 403;
      return json(res, status, { error: message });
    }

    const now = Math.floor(Date.now() / 1000);
    const roomName = 'watch-' + code.toLowerCase();
    const identity = 'p-' + String(member.participant_id).replace(/-/g, '') + '-' + randomUUID().slice(0, 8);
    const token = signToken(apiKey, apiSecret, {
      iss: apiKey,
      sub: identity,
      nbf: now - 5,
      exp: now + 30 * 60,
      identity,
      name: String(member.display_name || 'Viewer').slice(0, 32),
      metadata: JSON.stringify({ roomCode: code, participantId: member.participant_id, role: member.role }),
      video: {
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: false,
        canPublishSources: ['microphone'],
      },
    });
    return json(res, 200, { url: openViduUrl, token, room: roomName, expiresAt: now + 30 * 60 });
  } catch (error) {
    return json(res, 502, { error: error.message || 'Could not authorize the OpenVidu voice session.' });
  }
}
