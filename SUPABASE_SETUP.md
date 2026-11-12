# Supabase setup

MCU Viewing Order uses Supabase for email/password authentication and per-account cloud sync. Firebase is no longer used by the web app.

## 1. Create the Supabase project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open **Project Settings → API**.
3. Copy the **Project URL** and the **anon/public** key (or the newer **publishable** key).

## 2. Create the database table

1. Open **SQL Editor → New query** in the Supabase dashboard.
2. Open `supabase/setup.sql` from this repository.
3. Copy the complete file into the SQL editor and press **Run**.

The script creates `public.user_data`, enables Row Level Security, and adds policies that allow each signed-in user to read and write only their own row. It is safe to run again.

## 3. Enable email and password authentication

1. Open **Authentication → Sign In / Providers → Email**.
2. Enable Email provider and keep password authentication enabled.
3. Choose whether new accounts must confirm their email. If confirmation is enabled, users receive a confirmation email before their first login.

No Google, social, anonymous, or phone sign-in is used by this app.

## 4. Configure redirect URLs

In **Authentication → URL Configuration** set your production site as the Site URL, then add these Redirect URLs:

- `https://YOUR-VERCEL-DOMAIN.vercel.app/**`
- `https://YOUR-CUSTOM-DOMAIN/**` (if you use one)
- `http://localhost:5173/**` (local development)

Password recovery returns to your site and opens the **Choose a new password** screen. Make sure your production and preview domains are allowed if you test reset links on preview deployments.

## 5. Add Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, add:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your anon/public or publishable key |

Add them to Production, Preview, and Development as needed, then redeploy.

For Android APK builds or GitHub Actions builds, also add the same two values under **GitHub → Repository Settings → Secrets and variables → Actions** with the exact names `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Vercel environment variables are not automatically available to GitHub Actions.

These two values are designed to be public in a browser application. **Never put a Supabase service-role/secret key in a `VITE_*` variable or in this repository.** Row Level Security is the security boundary for user data.

For local development, copy `.env.example` to `.env.local` and fill in the same two values.

## 6. What syncs

Each account has one row in `public.user_data`. The JSON payload stores viewing actions, profile name, and the current watch item. The app loads that row after login, pushes local changes automatically, and checks for changes from other signed-in devices about every 25 seconds. If local edits and a remote update collide, the existing conflict UI lets you choose cloud data or keep local data.

Data stays local when signed out. Signing in on another device loads the account's cloud copy. A newly created account starts with the local data on the device where it was created.

## Troubleshooting

- **Invalid API key / missing Supabase configuration:** check the URL and public key in Vercel, then redeploy.
- **Table not found:** run all of `supabase/setup.sql` in the SQL editor.
- **Permission denied / row-level security:** confirm the SQL ran successfully and that the user is signed in.
- **Reset email does not return to the app:** add the exact production domain to Authentication → URL Configuration → Redirect URLs, and check the Supabase email template's reset link configuration.
- **Confirmation email not arriving:** check spam and the Supabase project's Authentication email settings.

