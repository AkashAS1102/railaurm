# RailAurum 🚆

A premium Indian railway reservation application — search trains, compare fares, book seats, and get instant PNR e-tickets.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Vite + TanStack Router |
| **Styling** | Tailwind CSS + Radix UI / Shadcn |
| **Backend API** | Java 21 + Spring Boot 3 + JDBC |
| **Database** | PostgreSQL via Supabase |
| **Auth** | Supabase Auth (JWT) |
| **Frontend Hosting** | **Vercel** |
| **Backend Hosting** | **Render** (Docker / Java) |

---

## Deployment & Hosting Guide

Follow these steps to host the full-stack project from scratch.

### 1. Push Code to GitHub

1. Create a new repository on [GitHub](https://github.com/new) (e.g. `railaurum`). Do **not** initialize with a README or .gitignore.
2. In your local terminal, add the remote and push:

```bash
git remote add origin https://github.com/<your-username>/railaurum.git
git branch -M main
git push -u origin main
```

---

### 2. Set Up Database (Supabase PostgreSQL)

1. Create a project at [supabase.com](https://supabase.com).
2. Apply migrations to initialize tables (stations, trains, schedules, bookings, passengers):
   ```bash
   # Using Supabase CLI:
   supabase login
   supabase link --project-ref <your-project-id>
   supabase db push
   ```
   *(Or run the SQL scripts in `supabase/migrations/` directly in the Supabase SQL Editor).*

---

### 3. Deploy Backend to Render (Java / Docker)

The backend uses a multi-stage Docker build to package the Spring Boot JAR with Eclipse Temurin Java 21.

1. Go to [Render Dashboard](https://dashboard.render.com/) → Click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name**: `railaurum-backend`
   - **Root Directory**: `backend`
   - **Runtime**: **Docker** (it automatically uses `backend/Dockerfile`)
   - **Instance Type**: **Free**
4. Add **Environment Variables** in Render:

| Key | Value / Example | Description |
|---|---|---|
| `PORT` | `8080` | Port for the web service |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<db-host>:5432/postgres` | Supabase Database JDBC Connection URL |
| `SPRING_DATASOURCE_USERNAME` | `postgres` | Database username |
| `SPRING_DATASOURCE_PASSWORD` | `<your-db-password>` | Supabase database password |
| `SUPABASE_URL` | `https://<your-project-id>.supabase.co` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `<your-service-role-key>` | Secret key from Project Settings → API |
| `SUPABASE_JWT_SECRET` | `<your-jwt-secret>` | Secret from Project Settings → API → JWT Settings |
| `FRONTEND_URL` | `*` *(or your Vercel URL once deployed)* | Allowed CORS origin |

5. Click **Create Web Service**.
6. When deployment finishes, copy your Render public URL (e.g. `https://railaurum-backend.onrender.com`).

---

### 4. Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → **Add New...** → **Project**.
2. Import your GitHub repository (`railaurum`).
3. Project Configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add **Environment Variables** in Vercel:

| Key | Value / Example |
|---|---|
| `VITE_SUPABASE_URL` | `https://<your-project-id>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `<your-supabase-anon-or-publishable-key>` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `<your-supabase-anon-or-publishable-key>` |
| `VITE_BACKEND_URL` | `https://railaurum-backend.onrender.com` |

5. Click **Deploy**. Vercel will build the frontend and provide your live URL (e.g., `https://railaurum.vercel.app`).

---

### 5. Configure CORS (Final Link)

Once your Vercel site is live:
1. Open Render Dashboard → `railaurum-backend` → **Environment**.
2. Change `FRONTEND_URL` to your production Vercel URL (e.g. `https://railaurum.vercel.app`).
3. Save changes.

---

## Local Development

### Prerequisites
- Node.js 18+ & npm
- Java 21+ & Maven

### 1. Configure Frontend Environment

Create `.env` in the root folder:

```env
VITE_SUPABASE_URL="https://<your-project-id>.supabase.co"
VITE_SUPABASE_ANON_KEY="<your-anon-or-publishable-key>"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon-or-publishable-key>"
VITE_BACKEND_URL="http://localhost:8080"
```

### 2. Configure Backend Environment

Create `backend/.env` (or set environment variables):

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://<db-host>:5432/postgres
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=<your-db-password>
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_JWT_SECRET=<your-jwt-secret>
FRONTEND_URL=http://localhost:5173
```

### 3. Start the Apps

```bash
# Terminal 1 — Frontend
npm install
npm run dev

# Terminal 2 — Backend
cd backend
mvn spring-boot:run
```

- Frontend runs at: `http://localhost:5173`
- Backend runs at: `http://localhost:8080`

---

## Project Structure

```
railaurum/
├── src/
│   ├── routes/                  # File-based routing (TanStack Router)
│   │   ├── __root.tsx           # Root layout & navbar
│   │   ├── index.tsx            # Home page & hero search
│   │   ├── auth.tsx             # Sign in / demo login
│   │   ├── search.tsx           # Search results & train listing
│   │   ├── live.tsx             # Live train tracking
│   │   └── _authenticated/      # Protected routes (auth guarded)
│   │       ├── bookings.tsx     # User booking history
│   │       ├── book.tsx         # Seat reservation & passenger details
│   │       ├── ticket.$pnr.tsx  # Printable e-ticket view
│   │       └── admin.tsx        # Train & schedule management
│   ├── components/              # UI components (Radix / Tailwind)
│   ├── integrations/supabase/   # Supabase client with custom fetch & types
│   ├── lib/                     # Data fetching & business logic
│   └── main.tsx                 # Vite SPA entry point
├── backend/                     # Java Spring Boot + JDBC Backend
│   ├── src/main/java/com/railaurum/backend/
│   │   ├── config/              # SecurityConfig (JWT & CORS)
│   │   ├── controller/          # REST Controllers (Public, Booking, Auth)
│   │   ├── model/               # Records (Station, Train, Schedule, Booking)
│   │   └── repository/          # JDBC Repositories (JdbcTemplate queries)
│   ├── Dockerfile               # Production Docker container definition
│   └── pom.xml                  # Maven dependencies
├── supabase/migrations/         # PostgreSQL schema, RLS, and seed data
├── vercel.json                  # SPA routing configuration for Vercel
├── render.yaml                  # Infrastructure blueprint for Render
└── README.md
```
