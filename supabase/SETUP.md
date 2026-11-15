# Supabase setup

This folder has **one canonical SQL file**: [setup.sql](./setup.sql).

It contains the database setup for the website's existing account viewing-data sync **and** Watch Together (screening rooms, guest participants, room presence, chat, playback sync, host/operator/viewer roles, access/skip requests, guest renaming, per-account Watch Together history, and fast playback-state polling). Keep using this same file when the project adds or updates database features. Do not run old feature-specific SQL files.

## First-time setup

1. Open your project's [Supabase Dashboard](https://supabase.com/dashboard).
2. Select the Supabase project connected to this website.
3. Open **SQL Editor** and create a new query.
4. Open [setup.sql](./setup.sql) in this repository and copy the entire file.
5. Paste it into the SQL Editor and click **Run**.
6. Check that Supabase reports success before testing account sync or Watch Together.

## Updating later

When the repository updates supabase/setup.sql, use the same procedure and run the **entire updated file** again. The file is designed to be re-runnable:

- Tables are created with CREATE TABLE IF NOT EXISTS.
- Functions are created or updated with CREATE OR REPLACE FUNCTION.
- Indexes and the required foreign key are added only when missing.
- Existing row-level security policies are replaced with the policy definitions in this file.
- Grants are refreshed to match the current application permissions.

You do not need to work out which individual migration to run. Always use the latest setup.sql from the repository's main branch.

## Data-safety guarantees

The setup file is intentionally additive and repeatable. It does **not** contain DROP TABLE or TRUNCATE statements, and it does not delete account viewing data or Watch Together history. It includes a defined retention policy: closed or expired screening rooms are deleted after seven days, together with their participants, chat and requests. History is stored separately and retained.

A few important distinctions:

- CREATE TABLE IF NOT EXISTS preserves existing table contents.
- CREATE OR REPLACE FUNCTION updates function logic without removing table rows.
- The script may replace named RLS policies and refresh grants so permissions stay aligned with the app. This changes access rules, not stored data.
- Closing or leaving a screening room changes its status/presence. Closed/expired room rows are retained for seven days, then removed by the daily cleanup job when pg_cron is enabled. Participants, chat and requests are deleted with their room.
- Watch Together history is stored independently, without a cascading room foreign key, so old-room cleanup does not erase watched-title and duration statistics.
- Room creation and joining also run a cleanup pass, so expired records are removed opportunistically even without the scheduled extension.


**The seven-day room-retention rule above is the only automatic data cleanup in this master setup.** Do not add any other deletion or destructive migration without documenting exactly what it affects and requiring an explicit manual decision.

## If setup fails

- Read the complete error message in Supabase SQL Editor.
- Do not delete tables or reset the project to fix a setup error.
- If the error mentions a missing or conflicting column/constraint, stop and share the error so the migration can be made compatible with the current schema.
- If the project already has the older setup.sql and Watch Together scripts installed, run this consolidated master file. It updates the existing functions and policies without dropping the existing tables or rows.

## Required external setup

Enable **pg_cron** in Supabase Dashboard → Database → Extensions to run the daily room cleanup at 03:17 UTC. The master SQL file schedules or refreshes the job automatically when pg_cron is available. If you leave pg_cron disabled, cleanup runs when someone creates or joins a room, but not on a guaranteed daily schedule.

The website still needs its existing Supabase project URL and public/anon key configured in its deployment environment. Do not put a service-role key in browser code or public repository files.

## Current database objects

- public.user_data — authenticated users' synced viewing data.
- public.watch_rooms — screening room and media/playback state.
- public.watch_room_participants — signed-in and guest room identities.
- public.watch_room_messages — room chat.
- public.watch_together_history — per-account screening history, retained independently of room cleanup.
- public.create_watch_room, join_watch_room, watch_room_snapshot, watch_room_heartbeat, set_watch_room_playback, send_watch_room_message, leave_watch_room, close_watch_room, rename_watch_room_participant, record_watch_together_history, get_watch_together_history, and cleanup_expired_watch_rooms — the Watch Together RPC functions.

## Watch Together room roles

- **Host:** creates and closes the room, controls playback, and approves or denies access and skip requests.
- **Operator:** can play, pause, seek, and skip for everyone. The host grants this role by approving an Operator request.
- **Viewer:** can watch and chat, and can request Operator access or a one-time 10-second skip. Playback changes are enforced by database permissions, not just hidden buttons.

The same master `setup.sql` creates the request queue and its RPC permissions without dropping existing room or participant data. Run the full updated master file again after a database update.


### Playback responsiveness update

The room now checks a lightweight playback-state RPC roughly every 450 ms, while full room/chat/member refreshes happen less frequently. This reduces command propagation delay without repeatedly downloading the full chat history. Re-run the complete `setup.sql` after this update to add the playback snapshot RPC.
