# Mail Sender

A local TypeScript monorepo for sending a CSV list through Gmail OAuth or SMTP. It saves a subject and plain-text message as a template, previews personalized emails, and sends one recipient at a time from a persistent database queue.

## Project layout

- `apps/web/src/routes` — central React Router definitions
- `apps/web/src/modules` — Overview, Templates, and Campaign pages
- `apps/web/src/services` — typed API client and response types
- `apps/api/src/modules` — accounts, templates, campaigns, and mail transports
- `apps/api/src/database/models.ts` — Sequelize models
- `apps/api/src/database/migrations` — versioned SQL schema migrations
- `apps/api/src/worker` — separate sequential sending process
- `data/mail-sender.sqlite` — local SQLite database, ignored by Git

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
```

If `.env` does not exist, copy `.env.example` to `.env`. The file needs a 64-character hex `APP_ENCRYPTION_KEY`; generate one with `openssl rand -hex 32` and set it in `.env`. Keep the key if you want to keep using a saved Gmail connection; changing it makes the stored token unreadable.

Choose **one** sending mode in `.env`:

### SMTP mode

Set these values and restart `npm run dev`:

```dotenv
SMTP_ENABLED=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password-or-app-password
SMTP_FROM=you@example.com
```

Use `SMTP_SECURE=true` for an implicit TLS connection, commonly on port 465. With `SMTP_SECURE=false`, the app requires STARTTLS before authenticating. The SMTP username and password stay in the backend `.env` file and are never returned to React. The screen shows whether the required settings are present; it cannot verify the credentials until the server attempts a send. Use credentials issued by your email provider, and make sure `SMTP_FROM` is an address that provider allows you to send from.

### Gmail OAuth mode

Set `SMTP_ENABLED=false` (the default), then set up a Google Cloud project:

1. Enable the **Gmail API**.
2. Configure the OAuth consent screen. For a testing app, add your Gmail address as a test user.
3. Create an OAuth client of type **Web application**.
4. Add `http://127.0.0.1:3100/auth/google/callback` as an authorized redirect URI.
5. Put the client ID and client secret in `.env`.

Then run:

```bash
npm run dev
```

`npm run dev` applies pending migrations, then starts the API, worker, and Vite. Open **http://127.0.0.1:5173**. The API runs at `127.0.0.1:3100`. Stop any older `npm run dev` process before starting another one, so these ports are free.

The routes are `/` for Overview, `/send` for a direct email, `/templates` for creating and editing templates, `/campaigns/new` for CSV preview, `/campaigns` for the campaign table, and `/campaigns/:id` for progress and recipient results. In Gmail mode, choose **Connect Gmail** first. In SMTP mode, the configured sender appears on Overview. A new campaign starts paused; press **Start / resume** on its detail page after reviewing recipients. Editing a template affects new campaigns; existing campaigns retain their saved subject and message.

On **Send email**, enter one recipient, subject, and message, then optionally attach up to five files totaling 10 MB. Press **Send email** to submit immediately through the configured Gmail or SMTP sender. Recent direct sends show their submission status. A `sent` status means the provider accepted the message; it does not guarantee delivery. If a send is `uncertain`, check your Sent folder or provider logs before retrying. Direct sends count toward the same local 24-hour limit as campaign messages.

Set `SENDER_NAME` in `.env` to show a name alongside the sender address in recipients' inboxes. Messages include both plain-text and HTML versions so paragraph spacing displays consistently across email clients.

The CSV must have an `email` column. Other column names can appear in your template as `{{column_name}}`. Download the sample CSV from the app. Headers are converted to lowercase; use simple names containing letters, numbers, and underscores for placeholders.

## Sending behavior

- The separate worker sends one message per recipient. The default interval is 30 seconds, with a local cap of 50 messages in a rolling 24-hour period. Change `SEND_INTERVAL_MS` and `DAILY_SEND_LIMIT` in `.env`, then restart the worker. Your provider's own limits also apply.
- Duplicate and invalid addresses are skipped on import. Each campaign stores a snapshot of its subject and message.
- A successful Gmail API or SMTP submission is recorded as `sent`; delivery to the recipient is not guaranteed.
- Quota and authentication errors pause the campaign. A network failure or server error during a send is marked `uncertain` and pauses the campaign, because the message may already have been accepted. Check the sender's Sent folder or provider logs before taking further action.
- A campaign starts paused. It never sends just because a CSV was uploaded.
- Disconnect removes the locally stored refresh token and pauses any running campaign. It does not revoke authorization in your Google Account settings.

## Database and build commands

```bash
npm run migrate -w @mail-sender/api  # apply pending migrations
npm run check                       # typecheck both workspaces
npm run build                       # build API and React app
```

The migration runner records applied files in `SequelizeMeta`. It adds the new schema to the existing `data/mail-sender.sqlite` without deleting earlier templates, campaigns, or send history. Set `MAIL_DB_PATH` to a different SQLite file to run an isolated local instance. For production, run migrations before starting the compiled API and worker. The app is designed for one worker process.

## Scope and limits

This is a **single-user, localhost-only** app. It has no user login and must not be exposed directly to the internet. The Gmail refresh token is encrypted in the local database with `APP_ENCRYPTION_KEY`. Back up the key together with the database; losing the key requires reconnecting Gmail. The SMTP password lives only in the ignored `.env` file. The frontend receives neither secret.

In Gmail mode, the app requests `gmail.send` and basic account identity, so it does not read replies or use Gmail Pub/Sub. Public distribution may require [Google OAuth verification](https://developers.google.com/workspace/gmail/api/auth/scopes). See [Gmail API sending](https://developers.google.com/workspace/gmail/api/guides/sending) and [Gmail sending limits](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace).
