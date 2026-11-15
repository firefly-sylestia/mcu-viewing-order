# Supabase setup

This folder has **one canonical SQL file**: [setup.sql](./setup.sql).

It contains the database setup for the website's existing account viewing-data sync **and** Watch Together (screening rooms, guest participants, room presence, chat, playback sync, host/operator/viewer roles, and access/skip requests). Keep using this same file when the project adds or updates database features. Do not run old feature-specific SQL files.

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

The setup file is intentionally additive and repeatable. It does **not** contain DROP TABLE, TRUNCATE, or data-deleting cleanup statements. It does not delete existing account data, rooms, participants, or chat messages.

A few important distinctions:

- CREATE TABLE IF NOT EXISTS preserves existing table contents.
- CREATE OR REPLACE FUNCTION updates function logic without removing table rows.
- The script may replace named RLS policies and refresh grants so permissions stay aligned with the app. This changes access rules, not stored data.
- Closing or leaving a screening room changes its status/presence; it does not erase the room's records.
- No automatic expiry cleanup is enabled by this setup. Expired room records remain in the database until an administrator deliberately applies a separately reviewed retention policy.

**Never add destructive table or data cleanup to this master setup script.** If a future feature genuinely needs a destructive migration or retention cleanup, document it separately, explain exactly what it affects, and require an explicit manual decision.

## If setup fails

- Read the complete error message in Supabase SQL Editor.
- Do not delete tables or reset the project to fix a setup error.
- If the error mentions a missing or conflicting column/constraint, stop and share the error so the migration can be made compatible with the current schema.
- If the project already has the older setup.sql and Watch Together scripts installed, run this consolidated master file. It updates the existing functions and policies without dropping the existing tables or rows.

## Required external setup

No extra Supabase extension, scheduled job, or separate database script is required for the current implementation. The website still needs its existing Supabase project URL and public/anon key configured in its deployment environment. Do not put a service-role key in browser code or public repository files.

## Current database objects

- public.user_data — authenticated users' synced viewing data.
- public.watch_rooms — screening room and media/playback state.
- public.watch_room_participants — signed-in and guest room identities.
- public.watch_room_messages — room chat.
- public.create_watch_room, join_watch_room, watch_room_snapshot, watch_room_heartbeat, set_watch_room_playback, send_watch_room_message, leave_watch_room, and close_watch_room — the Watch Together RPC functions.

## Watch Together room roles

- **Host:** creates and closes the room, controls playback, and approves or denies access and skip requests.
- **Operator:** can play, pause, seek, and skip for everyone. The host grants this role by approving an Operator request.
- **Viewer:** can watch and chat, and can request Operator access or a one-time 10-second skip. Playback changes are enforced by database permissions, not just hidden buttons.

The same master `setup.sql` creates the request queue and its RPC permissions without dropping existing room or participant data. Run the full updated master file again after a database update.
