# Setting up your Supabase database

This guide walks you through creating a free Supabase project, creating all
the (empty) tables this app needs, and connecting the app to it. No coding
required — just copy/paste.

## 1. Create your Supabase project

1. Go to **https://supabase.com** and sign up / log in.
2. Click **New project**.
3. Pick an organisation, give the project a name (e.g. `dahabo-global-logistics`),
   set a strong database password (save it somewhere safe), pick a region close
   to Kenya (e.g. `eu-central-1` or `af-south-1` if available), and click
   **Create new project**. Wait ~2 minutes for it to provision.

## 2. Create the tables

1. In your new project, open the left sidebar → **SQL Editor**.
2. Click **New query**.
3. Open the file `supabase/schema.sql` in this project, copy its **entire**
   contents, and paste it into the SQL editor.
4. Click **Run** (or press Ctrl/Cmd + Enter).
5. You should see "Success. No rows returned." When it finishes, go to
   **Table Editor** in the sidebar — you'll see every table (`profiles`,
   `drivers`, `vehicles`, `shipments`, `assignments`, `customers`,
   `warehouses`, `invoices`, `payments`, `documents`, `notifications`,
   `audit_logs`, `branches`), all empty and ready to use.

This schema also turns on **Row Level Security** on every table, so only
signed-in staff/admin/driver accounts can read or write data — there is no
public/anonymous or "customer" access.

### 2b. Run the driver-accounts migration

Open `supabase/migrations/002_driver_accounts.sql`, copy its contents into a
**New query** in the SQL editor, and run it. This adds:

- a `must_change_password` flag on `profiles`, used to force a driver (or
  any admin-created account) to set their own password on first login,
- a `driver_advances` table that records cash handed to a driver and their
  write-up of how it was spent (shown on the driver's own dashboard).

(If you're setting up a brand-new project, `schema.sql` already includes
these — this step is only needed to bring an existing project up to date.)

## 3. Turn on email/password sign-in

1. Sidebar → **Authentication → Providers**.
2. Make sure **Email** is enabled (it is by default).
3. Sidebar → **Authentication → Settings** → for a first test you can turn
   **off** "Confirm email" so new accounts work immediately (turn it back on
   before going live, or set up a proper email sender under
   **Authentication → Email Templates / SMTP Settings**).

## 4. Create your first Admin user

You need one account that can log in and create everyone else.

1. Sidebar → **Authentication → Users → Add user → Create new user**.
2. Enter your email and a password, and click **Create user**. Copy the
   **User UID** shown in the table.
3. Go back to **SQL Editor → New query** and run (replace the values):

```sql
update public.profiles
set role = 'admin',
    full_name = 'Your Name',
    staff_code = 'USR-001'
where id = 'paste-the-user-uid-here';
```

   (A `profiles` row is created automatically the moment the auth user is
   created — this just promotes that row to `admin`.)

You can now sign in to the app's `/staff-login` page with that email and
password, and you'll have full admin access.

## 5. Get your API keys

1. Sidebar → **Project Settings → API**.
2. Copy the **Project URL** and the **anon / public** key.
3. Also copy the **service_role** key from the same page — keep this one
   secret, it bypasses Row Level Security. It's what lets an admin create a
   driver's login with a password directly (see step 7).

## 6. Connect the app

1. In the project root, copy `.env.example` to a new file named `.env`.
2. Fill in the two public values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Restart the dev server (`npm run dev`) if it was already running.

That's it — the app will now read/write real data from your Supabase
project. If `.env` is missing or incomplete, the app automatically falls
back to a **local demo mode** (data is kept in your browser only) so you can
still click around and test the UI without a database connected.

## 7. Enable admin-created driver logins

Adding a driver from `/staff/drivers` lets the admin set the driver's login
email and a temporary password directly (instead of an email invite), so
the driver can be handed their credentials and log in right away. This
needs the **service role** key, but only ever on the server — it's never
sent to the browser.

1. Add one more line to your `.env` (note: **no `VITE_` prefix** — that
   prefix is what makes a variable visible to the browser, and this one must
   not be):

```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

2. If you deploy this app, set `SUPABASE_SERVICE_ROLE_KEY` (and
   `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) as real environment
   variables on your hosting platform — don't ship `.env` itself.
3. Restart the dev server after adding it.

Without this key, adding a driver will fail with a clear error message
rather than silently doing nothing.

## What's already wired up to the database

- **Staff & drivers**: Admins can add staff (`/staff/users`, sent an email
  sign-in link) and drivers (`/staff/drivers`, given a login email +
  temporary password directly). Every driver gets a company driver ID, and
  only full name, national ID and licence number are required up front —
  everything else (licence expiry, next of kin, base branch...) can be
  filled in later.
- **First-login password change**: any admin-created driver account is
  flagged `must_change_password`; they're required to set their own
  password (`/create-password`) before they can use their dashboard.
- **Deactivating a driver**: from a driver's profile page, an admin can
  deactivate their account — this blocks sign-in immediately, even with the
  correct password, until reactivated.
- **Driver dashboard & cash advances**: drivers only see a lightweight
  `/driver` dashboard (not the full staff app). Staff can record cash
  handed to a driver from that driver's profile page; the driver sees it on
  their dashboard and can submit how it was used.
- **Driver detail & work assignment**: Clicking a driver opens their full
  profile. From there, staff can assign work (a delivery, pickup, transfer,
  etc.) directly to that driver.
- **Shipments & customers**: `/staff/shipments` and `/staff/customers` read
  straight from the (initially empty) `shipments`/`customers` tables — no
  more sample data.

## Extending it further

The tables for fleet, warehouses, invoices, payments, documents,
notifications and audit logs are all created and ready — the dashboard
pages for those currently still show sample data. Wiring each one up
follows the same pattern used for drivers/shipments/customers: see
`src/lib/api/drivers.ts`, `src/lib/api/shipments.ts` and
`src/lib/api/customers.ts` for a template, and `src/lib/supabase.ts` for the
client.

## Regenerating TypeScript types (optional)

If you install the [Supabase CLI](https://supabase.com/docs/guides/cli), you
can generate exact TypeScript types from your live schema:

```sh
npx supabase login
npx supabase gen types typescript --project-id your-project-ref > src/lib/database.types.ts
```

This project ships with hand-written types in `src/lib/api/types.ts` that
match `supabase/schema.sql` — the generated file above is a drop-in
replacement once you're ready.
