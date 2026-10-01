# Portfolio CMS

A responsive Next.js portfolio and a custom Express CMS backed by PostgreSQL through Prisma. The portfolio uses a warm editorial visual language inspired by the supplied Aggroso reference; the CMS is custom-built and does not depend on a hosted CMS provider.

## Stack

- Client: Next.js 16, React 19, Tailwind CSS 4, Lucide React
- Server: Express 5, Prisma 6, PostgreSQL/Supabase
- Admin authentication: bcrypt password hashes and short-lived JWTs in HTTP-only cookies
- Uploads: authenticated image uploads to local disk (5 MB maximum)

## Local Setup

1. Configure the server environment:

   ```powershell
   cd server
   Copy-Item .env.example .env
   ```

   Set `DATABASE_URL` to the Supabase pooled connection string and `DIRECT_URL` to the direct connection string. Set two different random values for `JWT_SECRET` and `JWT_REFRESH_SECRET` (at least 32 characters), then set the admin name, email, and password. Do not commit `.env`.

2. Install dependencies and prepare the database:

   ```powershell
   npm install
   npm run db:generate
   npm run db:migrate
   npm run db:seed:content
   npm run db:seed
   ```

   For a fresh, empty development database, `db:migrate` applies the checked-in initial migration and creates later development migrations. The configured Supabase database has already been synchronized and its initial migration baselined. `db:seed:content` upserts the verified profile, projects, skills, education, and services. `db:seed` creates or updates the admin account using the values in `.env`.

   The configured Supabase `public` schema was confirmed empty, initialized from the Prisma schema, and the initial migration recorded as applied. Do not rerun the initial SQL against this database.

3. Start the API:

   ```powershell
   npm run dev
   ```

   The API listens on `http://localhost:10000` with the supplied local environment configuration.

4. In a second terminal, configure and start the client:

   ```powershell
   cd client
   Copy-Item .env.example .env.local
   npm install
   npm run dev
   ```

   Open `http://localhost:3000`. The CMS login is at `/admin`. For a deployed client, set `NEXT_PUBLIC_API_URL` to the deployed API base such as `https://api.example.com/api`; server-rendered content uses this value unless `CMS_API_URL` is set.

When CMS collections are empty, the home page uses profile details, skills, education, and projects verified from Saurabh's public GitHub profile. Published CMS collections replace those defaults. Blog posts and testimonials are hidden until you add real content.

## CMS and API

- `GET /api/portfolio` returns the profile and published skills, projects, articles, experience, testimonials, and services in one request.
- `GET /api/about` returns the public profile.
- `GET /api/{skills,projects,blogs,experience,testimonials,services}` returns published records.
- Authenticated `GET /api/{collection}?admin=true` includes drafts for the dashboard.
- Authenticated `POST`, `PUT`, and `DELETE` routes manage collections; `PUT /api/about` saves the profile.
- `POST /api/auth/login`, `POST /api/auth/refresh`, and `POST /api/auth/logout` manage the cookie session.
- `POST /api/contact` stores a message. SMTP delivery is enabled when the `SMTP_*` and `CONTACT_TO` settings are configured. Admins can review messages at `/api/messages`.
- `POST /api/upload/image` accepts an authenticated multipart image in the `image` field. Uploaded media is listed at `GET /api/media`.
- `GET /api/health` is a database-independent health check.

The API restricts CORS to `CLIENT_ORIGIN`; set this to the deployed client origin in production. HTTPS is required in production for secure cookies. Local-disk uploads are suitable for development and persistent single-server hosting; use durable object storage for ephemeral/serverless hosting.

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