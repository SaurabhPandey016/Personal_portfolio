# Portfolio CMS

A responsive Next.js portfolio and a custom Express CMS backed by PostgreSQL through Prisma. The portfolio uses an obsidian-and-gold visual system; the CMS is custom-built and does not depend on a hosted content platform.

## Stack

- Client: Next.js 16, React 19, Tailwind CSS 4, Lucide React
- Server: Express 5, Prisma 6, PostgreSQL/Supabase
- Admin authentication: bcrypt password hashes and short-lived JWTs in HTTP-only cookies
- Uploads: authenticated uploads of any file type up to 10 MB, stored in the existing PostgreSQL database

## Local Setup

1. Configure the server environment:

   ```powershell
   cd server
   Copy-Item .env.example .env
   ```

   Set `DATABASE_URL` to the PostgreSQL connection string used by the API and `DIRECT_URL` to the direct connection string used by Prisma migrations. Set two different random values for `JWT_SECRET` and `JWT_REFRESH_SECRET` (at least 32 characters), then set the admin name, email, and password. File uploads use this same PostgreSQL database; no separate storage URL, key, or bucket is needed. Contact messages are saved to the database even when email is not configured. To enable Brevo notifications, supply the SMTP login in `SMTP_USER`, a Brevo-issued SMTP key in `SMTP_PASS`, a sender verified by Brevo in `SMTP_FROM`, and the recipient in `CONTACT_TO`. Do not use a random password or commit `.env`.

2. Install dependencies and prepare the database:

   ```powershell
   npm install
   npm run db:generate
   npm run db:migrate:deploy
   npm run db:seed:content
   npm run db:seed
   ```

   For a fresh, empty development database, `db:migrate` applies the checked-in initial migration and creates later development migrations. The configured Supabase database has already been synchronized and its initial migration baselined. `db:seed:content` upserts the verified profile, projects, skills, education, and services. `db:seed` creates or updates the admin account using the values in `.env`.

   The configured Supabase `public` schema was confirmed empty, initialized from the Prisma schema, and the initial migration recorded as applied. Do not rerun the initial SQL against this database.

3. Start the API:

   ```powershell
   npm run dev
   ```

   The API listens on `http://localhost:10000` with the supplied local environment configuration. Uploaded file contents are stored in PostgreSQL in both development and production.

4. In a second terminal, configure and start the client:

   ```powershell
   cd client
   Copy-Item .env.example .env.local
   npm install
   npm run dev
   ```

   Open `http://localhost:3000`. The CMS login is at `/admin`. The browser talks to the API through the Next.js `/api` proxy; `CMS_API_URL` is the server-only API address used by the proxy and server-rendered pages.

When CMS collections are empty, the home page uses profile details, skills, education, and projects verified from Saurabh's public GitHub profile. Published CMS collections replace those defaults. Blog posts and testimonials are hidden until you add real content.

## CMS and API

- `GET /api/portfolio` returns the profile and published skills, projects, articles, experience, testimonials, and services in one request.
- `GET /api/about` returns the public profile.
- `GET /api/{skills,projects,blogs,experience,testimonials,services}` returns published records.
- Authenticated `GET /api/{collection}?admin=true` includes drafts for the dashboard.
- Authenticated `POST`, `PUT`, and `DELETE` routes manage collections; `PUT /api/about` saves the profile.
- `POST /api/auth/login`, `POST /api/auth/refresh`, and `POST /api/auth/logout` manage the cookie session.
- `POST /api/contact` stores a message. SMTP delivery is attempted only when valid `SMTP_*` and `CONTACT_TO` settings are configured; the response distinguishes sent, failed, and unconfigured email. Admins can review messages at `/api/messages`.
- `POST /api/upload/image` accepts one authenticated multipart file in the `image` field (any file type, up to 10 MB). Uploaded media is listed at `GET /api/media` and served from PostgreSQL at the URL returned for each file.
- `GET /api/health` is a database-independent health check.

The API restricts CORS to `CLIENT_ORIGIN`; set this to the deployed client origin in production. HTTPS is required in production for secure cookies. The media API serves common raster images inline and downloads other file types as attachments. Uploaded file bytes count toward the PostgreSQL database's storage and backup usage.

## Deploy to Render and Vercel

Before deploying, commit and push the project files to GitHub, but never add `server/.env` or `client/.env.local`. The API migration adds PostgreSQL columns for file storage; Render's startup command applies it automatically. It has not been applied to the configured database yet.

1. **Rotate exposed credentials.** The Brevo SMTP key was shared in chat. Create a replacement key in Brevo before production, and use only the replacement in the following steps. Never put it in GitHub or Vercel.
2. **Create the Render API service.** In Render, create a Blueprint from the GitHub repository and select the included `render.yaml`. Confirm the service root is `server`; the Blueprint runs `npm ci`, generates Prisma Client, applies pending migrations, and starts the API.
3. **Configure the Render environment.** Enter the following when prompted:
   - `DATABASE_URL`: PostgreSQL URL for the API. Use a Supabase session-pooler URL if the database's direct host is not reachable from Render.
   - `DIRECT_URL`: direct PostgreSQL connection URL used by Prisma migrations. If direct connectivity is unavailable, use a Supabase session-pooler URL (port 5432), not the transaction pooler (port 6543).
   - `ADMIN_PASSWORD`: a unique password of at least 12 characters.
   - `CLIENT_ORIGIN`: the exact Vercel production origin, for example `https://your-portfolio.vercel.app` (no trailing slash).
   - `SMTP_USER`: Brevo SMTP login; `SMTP_PASS`: the newly rotated Brevo SMTP key; `SMTP_FROM`: an address verified in Brevo; `CONTACT_TO`: the inbox that should receive submissions. The Blueprint sets host `smtp-relay.brevo.com`, port `587`, and STARTTLS.
   - Keep the separately generated `JWT_SECRET` and `JWT_REFRESH_SECRET` values.
4. **Wait for the first Render deploy.** Check `https://<render-service>.onrender.com/api/health`. Confirm startup logs report the API listening and migrations completed. A migration failure must be fixed before proceeding; do not mark an unapplied migration as applied manually.
5. **Seed the CMS.** From a trusted local terminal with the production `DATABASE_URL` and `DIRECT_URL` set in the ignored `server/.env`, run `npm run db:seed:content` and then `npm run db:seed` from `server`. Use your chosen admin account credentials. Do not run the seed against a database containing data you intend to preserve without reviewing `server/prisma/seed-content.js` first.
6. **Deploy the client on Vercel.** Import the same GitHub repository, set the project root to `client`, and keep the default Next.js framework/build settings.
7. **Set Vercel environment variables.** Add these for Production (and Preview too if you will use preview deployments):
   - `NEXT_PUBLIC_API_URL` = `/api`
   - `CMS_API_URL` = `https://<render-service>.onrender.com/api`

   The browser-facing API requests are proxied through the Next.js app, so admin session cookies stay first-party and work across browsers that restrict third-party cookies. `CMS_API_URL` is server-only; do not add database or SMTP credentials to Vercel.
8. **Set Render CORS origin.** Set `CLIENT_ORIGIN` to the exact deployed Vercel origin. For custom domains, use the public portfolio origin instead. Add additional comma-separated origins only if they are genuinely needed; restart/redeploy the API after changing it.
9. **Redeploy and verify.** Deploy Vercel after setting the environment variables. Open the production site, sign in at `/admin`, edit a CMS item, upload an image and a non-image file, submit a contact form, and confirm the message arrives at `CONTACT_TO`. Check Render logs if a request fails. Uploaded files and contact messages are stored in PostgreSQL.

Render's free service may sleep when idle, so its first request after inactivity can be slow. Render Free web services also block outbound SMTP ports, so use a paid Render instance if contact email notifications must be delivered; otherwise messages remain available in the admin inbox. Uploaded files consume database storage and backups. Brevo email works only with a valid SMTP key and a sender address verified in Brevo.

## Project Layout

```text
client/src/app/          Next.js routes and global styles
client/src/components/   Portfolio and CMS dashboard
client/src/lib/          CMS content types and fetch helpers
server/src/routes/       Auth, content, contact, portfolio, and upload routes
server/src/middleware/   Cookie authentication
server/prisma/           Seed script and SQL migrations
server/prisma/schema.prisma PostgreSQL content models
```

## Checks

```powershell
npm --prefix client run build
npm --prefix client run lint
npm --prefix server test
```