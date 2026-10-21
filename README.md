# PesoWise

PesoWise is a personal finance tracker for students and young professionals. It records income and expenses in Philippine pesos, tracks monthly budgets and savings goals, generates recurring transactions, and reports on the signed-in user's own data.

Savings goals are amounts you enter yourself. PesoWise is not connected to a bank.

## Stack

- React, Vite, and TypeScript, styled with Tailwind CSS
- Lucide icons and Recharts
- Express, Prisma, and PostgreSQL
- Session cookies, Zod validation, and Vitest

The repository is an npm workspace with three packages:

- `shared` — money, dates, analytics, CSV, and shared types
- `server` — API, Prisma schema, migrations, and tests
- `client` — the web application

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- PostgreSQL 16, or the built-in development database described below

## Setup

```bash
npm install
copy .env.example server\.env
```

On macOS or Linux, use `cp .env.example server/.env`.

`server/.env` is gitignored. Replace `SESSION_SECRET` before any shared or production deployment. The values in `.env.example` are local development defaults, not production secrets.

### Database

`npm run dev` starts a local PostgreSQL cluster with `embedded-postgres` when nothing is already listening on port 5432. The cluster is initialized as UTF-8 so names, notes, and peso signs can be stored. Data is stored in `server/.pgdata`, which is gitignored. The daemon creates the `pesowise` and `pesowise_test` databases and applies migrations. If startup reports a non-UTF-8 encoding, stop the app, delete `server/.pgdata`, and start again. That directory is only the local embedded cluster.

To use Docker instead, set `EMBEDDED_POSTGRES=false` in `server/.env` and start Compose before the app:

```bash
docker compose up -d
```

Compose uses PostgreSQL 16, user `pesowise`, password `pesowise_dev_password`, database `pesowise`, and also creates `pesowise_test` on first initialization. If you already have another PostgreSQL on port 5432, change the Compose port and both database URLs together.

Production never starts the embedded database. Provide a reachable `DATABASE_URL`.

### Vercel

The site and API deploy together as one Vercel project. Vercel cannot run the local embedded database, so production uses a hosted PostgreSQL database such as [Neon](https://neon.tech). Use the pooled connection string as `DATABASE_URL`, and append `pgbouncer=true` and `connection_limit=1` if the host offers a pooler.

In the Vercel project settings, set:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Hosted PostgreSQL connection string |
| `SESSION_SECRET` | At least 16 random characters |
| `CRON_SECRET` | Random string Vercel sends to the daily recurrence job |
| `CLIENT_ORIGIN` | The public site URL, for example `https://your-app.vercel.app` |

`npm run build:vercel` builds the client, generates the Prisma client, and applies migrations. A daily cron calls `GET /api/cron/recurring` at midnight in Asia/Manila. The Recurring page can still generate due items immediately. Set `COOKIE_SECURE` only when you need to override the production default, which already marks the session cookie `Secure`.

Apply migrations yourself when the API process is not the one starting the database:

```bash
npm run db:migrate
npm run db:seed
```

## Run

```bash
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:4000
- Health: `GET /api/health`

The Vite dev server proxies `/api` to the API. After `npm run build`, `npm start` serves the built client and the API from the same origin.

### Demo account

The seed script creates one demo user. Dates are relative to the current day in Asia/Manila, so charts stay in the present.

- Email: `demo@pesowise.app`
- Password: `DemoPass123!`
- Name: Alex Rivera

Run `npm run db:seed` after the database is up. `npm run dev` migrates but does not seed.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Database daemon, API, and Vite |
| `npm run build` | Production server bundle and client build |
| `npm start` | Run the production server |
| `npm test` | Server unit and API tests |
| `npm run lint` | ESLint for server and client |
| `npm run typecheck` | TypeScript for server and client |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Load the labeled demo account |

## Authentication

Sessions use an opaque token in the `pesowise.sid` cookie. The database stores an HMAC-SHA256 hash of the token, not the token itself. The cookie is `HttpOnly` and `SameSite=Lax`. It is `Secure` in production, or whenever `COOKIE_SECURE=true`.

Passwords are hashed with bcrypt. Login and registration are rate limited (10 requests per 15 minutes per IP). Tests and `RATE_LIMIT_DISABLED=true` skip that limit.

Every user-owned query uses the user id from the verified session. A missing or foreign record returns 404. Mutating `/api` requests must send `X-PesoWise-Request: 1`. The client sends this header. Error responses do not include stack traces, password hashes, or database credentials.

The supported deployment is one origin: the API serves `client/dist` and the browser calls `/api` on that same host. Set `CLIENT_ORIGIN` to the public site origin so CORS and cookies match. Use HTTPS in production.

## Dates and money

Transaction dates, budget months, goal target dates, and recurrence dates are calendar dates stored as `YYYY-MM-DD` strings. They are not PostgreSQL `date` columns, because JavaScript date objects shift the calendar day across timezones. `createdAt` and `updatedAt` are timestamps.

Dashboard presets (This Month, Last Month, Last 3 Months, This Year, and custom ranges) are calculated in `Asia/Manila`. Last 3 Months starts on the first day of the month two months ago and ends today. Month-over-month comparison uses the previous full month when the selected window is a full month. A partial window is shifted backward by the same number of days. A change from zero to zero is 0%. A change from zero to a positive amount has no percentage and is shown as an em dash.

Amounts are PostgreSQL `Decimal(14,2)`. The API sends canonical strings such as `1200.00`. The shared helpers convert those strings to integer centavos for arithmetic. Currency is formatted as Philippine pesos (`₱`).

The savings rate is `(income - expenses) / income`, shown to two decimal places. It is null when income is zero.

## Budgets, goals, and recurrence

A budget belongs to one expense category and one calendar month. The same user cannot have two budgets for that category and month. Spent amount is the sum of expense transactions in that category for the whole month, including days outside a shorter dashboard range. The default warning threshold is 80% of the limit and can be changed in Settings between 50 and 95. Status is normal, warning, or exceeded. Warning uses unrounded centavos: spent is warning when it has reached the threshold and has not reached the limit.

Budget alerts are deduplicated with the key `budget:{id}:{YYYY-MM}:WARNING` or `EXCEEDED`. Crossing straight past the limit creates only the exceeded alert. An alert that was already sent stays in the list if spending later drops.

A savings goal's saved amount cannot be negative or greater than the target. Raise the target before recording a larger saved amount. Completion creates one notification per target amount. Lowering the saved amount below the target clears the completion timestamp. These figures are manual and are not a bank balance.

Recurring rules are weekly, monthly, or yearly. Monthly and yearly dates keep the original day and clamp short months, so 31 January becomes 28 February and returns to 31 March. Each generated transaction has a unique `occurrence_key` of `{ruleId}:{YYYY-MM-DD}`. Processing takes a transaction-scoped advisory lock and skips keys that already exist, so running it twice does not duplicate a transaction. One run creates at most 36 occurrences per rule. The server processes due rules every 15 minutes, when the app loads, and when you choose Process due. Pausing skips missed dates; resuming schedules the next date on or after today. Downtime backfills because `nextOccurrence` stays in the past. Frequency and start date cannot be edited after creation. Generated history is not rewritten.

In-app notifications cover budget alerts, completed goals, generated recurrences, and account events. There are no browser push notifications.

## CSV export

Transaction and report exports respect the active filters. Every cell is quoted, rows use CRLF, and the file starts with a UTF-8 BOM. Text that begins with `=`, `+`, `-`, `@`, tab, or carriage return is prefixed with an apostrophe so a spreadsheet does not treat it as a formula. Transaction export is capped at 10,000 rows. An empty result still downloads a header row.

## Schema

| Table | Owns | Notes |
| --- | --- | --- |
| `users` | Account and warning threshold | Email is unique |
| `sessions` | Hashed session token | Cascade with the user |
| `categories` | Name, type, icon, color | Unique per user, type, and name. Archive keeps history |
| `transactions` | Money movement | Amount `Decimal(14,2)`, date `varchar(10)`. Category delete is restricted |
| `budgets` | Monthly category limit | Unique per user, category, month, and year |
| `savings_goals` | Manual target and saved amount | Database check: `0 <= saved <= target` |
| `recurring_transactions` | Schedule | Category delete is restricted |
| `notifications` | In-app alerts | Unique `(user_id, dedupe_key)`. Multiple null keys are allowed |

Deleting an account removes notifications, transactions, budgets, recurring rules, goals, categories, and sessions in that order, because category foreign keys restrict deletion while the user still has related rows.

## API

All routes except `GET /api/health` and the auth routes require a session. Mutating requests require `X-PesoWise-Request: 1` and `Content-Type: application/json` where a body is sent. Amounts are decimal strings. Dates are `YYYY-MM-DD`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account and default categories |
| POST | `/api/auth/login` | Start a session |
| POST | `/api/auth/logout` | End the current session |
| GET | `/api/auth/me` | Current profile |
| PATCH | `/api/profile` | Name, email, warning threshold |
| POST | `/api/profile/password` | Change password |
| DELETE | `/api/profile` | Delete the account. Body includes the password and the literal `DELETE` |
| GET, POST | `/api/categories` | List or create |
| PATCH | `/api/categories/:id` | Rename, icon, or color |
| POST | `/api/categories/:id/archive` | Archive without deleting history |
| POST | `/api/categories/:id/restore` | Restore |
| DELETE | `/api/categories/:id` | Delete only when nothing references it |
| GET | `/api/transactions` | Search, filter, sort, and paginate |
| GET | `/api/transactions/export` | CSV for the same filters |
| POST | `/api/transactions` | Create |
| GET, PATCH, DELETE | `/api/transactions/:id` | Read, update, delete |
| GET, POST | `/api/budgets` | List or create |
| PATCH, DELETE | `/api/budgets/:id` | Update or delete |
| GET, POST | `/api/goals` | List or create |
| PATCH | `/api/goals/:id` | Update details |
| PATCH | `/api/goals/:id/saved` | Update the saved amount |
| POST | `/api/goals/:id/archive` and `/restore` | Archive or restore |
| GET, POST | `/api/recurring` | List or create |
| PATCH, DELETE | `/api/recurring/:id` | Update or delete a rule |
| POST | `/api/recurring/:id/pause` and `/resume` | Pause or resume |
| POST | `/api/recurring/process` | Generate due occurrences for the current user |
| GET | `/api/dashboard?from&to` | Summary, charts, budgets, goals, recent transactions |
| GET | `/api/reports?from&to&categoryId` | Analytics |
| GET | `/api/reports/export?from&to&view` | `view=monthly` or `view=category` |
| GET | `/api/notifications` | Latest 100 and unread count |
| PATCH | `/api/notifications/:id/read` | Mark one read |
| POST | `/api/notifications/read-all` | Mark all read |

## Tests

`npm test` uses only `DATABASE_URL_TEST`, which must point at a database named `pesowise_test`. The test setup migrates that database. API tests refuse to run if `current_database()` is anything else, and they clear tables between cases.

Covered behavior includes registration and login, the request header, cross-account access, transaction totals, invalid amounts, duplicate budgets, date filters, zero income, budget updates after edits, month-over-month change from zero, recurring deduplication, savings progress, CSV formula escaping, and category deletion while history exists.
