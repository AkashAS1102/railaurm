# RailAurum 🚆

A premium Indian railway reservation demo — search trains, compare fares, book seats, and get instant PNR e-tickets.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TanStack Router |
| Styling | Tailwind CSS v4 + Radix UI |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Backend API | Express (for demo account creation) |
| Frontend deploy | **Vercel** |
| Backend deploy | **Render** |

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/your-username/railaurum.git
cd railaurum
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → anon key |
| `VITE_BACKEND_URL` | `http://localhost:3001` for local dev |

### 3. Set up the database

Apply all migrations to your Supabase project:

```bash
# Install Supabase CLI if needed: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref your-project-id
supabase db push
```

### 4. Run the app

```bash
# Terminal 1 — Frontend
npm run dev

# Terminal 2 — Backend (optional, needed for Demo buttons)
cd backend
cp .env.example .env   # fill in SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deploy to Production

### Frontend → Vercel

1. Push this repo to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BACKEND_URL` (your Render backend URL, e.g. `https://railaurum-backend.onrender.com`)
4. Deploy — Vercel auto-detects Vite

### Backend → Render

1. In [render.com](https://render.com), create a **Web Service**
2. Connect this GitHub repo
3. Settings:
   - **Root directory**: `backend`
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Environment**: Node
4. Set environment variables in Render dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (**keep secret!**)
   - `FRONTEND_URL` (your Vercel URL, for CORS)
5. Deploy

### Database → Supabase

Your PostgreSQL database lives in [supabase.com](https://supabase.com). All schema, RLS policies, and seed data are in `supabase/migrations/`. Apply them with:

```bash
supabase db push
```

---

## Project Structure

```
railaurum/
├── src/
│   ├── routes/          # File-based routing (TanStack Router)
│   │   ├── __root.tsx   # Root layout
│   │   ├── index.tsx    # Home page
│   │   ├── auth.tsx     # Sign in / Sign up
│   │   ├── search.tsx   # Train search results
│   │   ├── live.tsx     # Live train map
│   │   └── _authenticated/
│   │       ├── bookings.tsx    # My trips
│   │       ├── book.tsx        # Booking flow
│   │       ├── ticket.$pnr.tsx # E-ticket
│   │       └── admin.tsx       # Admin panel
│   ├── components/      # Reusable UI components
│   ├── integrations/supabase/  # Supabase client + types
│   ├── lib/             # Business logic (rail.ts, admin.ts)
│   └── main.tsx         # App entry point
├── backend/             # Express API for Render
│   ├── server.js
│   └── package.json
├── supabase/migrations/ # PostgreSQL schema + seed data
├── vercel.json          # Vercel SPA routing config
└── render.yaml          # Render service definition
```

---

## Environment Variables Reference

### Frontend (`.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `VITE_BACKEND_URL` | ✅ | Express backend URL (Render) |

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (keep secret!) |
| `FRONTEND_URL` | ✅ | Vercel frontend URL (for CORS) |
| `PORT` | auto | Set by Render automatically |
