# OpenVidu voice setup

The website integration uses OpenVidu Platform v3 with the LiveKit-compatible browser protocol. OpenVidu is the media server; Vercel only validates the Watch Together participant and signs a short-lived room token.

## 1. Deploy OpenVidu

Deploy OpenVidu Platform v3 on a public server using the official self-hosting guide:

https://openvidu.io/latest/docs/self-hosting/

Use a public DNS name and valid TLS certificate. Ensure the deployment's media networking/UDP ports are reachable from participants' networks. A local localhost OpenVidu URL will not work for viewers on other devices.

## 2. Add Vercel environment variables

Set these for Production (and Preview if you test there):

- OPENVIDU_URL = wss://your-openvidu-domain
- LIVEKIT_API_KEY = the API key from OpenVidu's openvidu.env
- LIVEKIT_API_SECRET = the API secret from OpenVidu's openvidu.env

Also ensure the existing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present. The API route accepts the existing public anon key only to call the membership-check RPC; it never uses a service-role key.

Do not expose LIVEKIT_API_SECRET in frontend variables or commit it to GitHub.

## 3. Update Supabase

Run the latest complete supabase/setup.sql in the Supabase SQL Editor. This adds watch_room_voice_access, which verifies the room code, participant token and host voice permission before the server issues a token.

Alternatively, apply supabase/migrations/20261117_openvidu_voice.sql if the rest of the master setup is already current.

## 4. Enable voice in a room

New rooms start with voice chat disabled. The host opens Host controls and enables Voice chat. Each participant then presses Join voice and allows microphone access. The participant can mute or leave at any time.

If the OpenVidu server or Vercel secrets are not configured, the app will show a setup/connection error rather than falling back to the old peer-to-peer signalling implementation.
