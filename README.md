# Roadmap Generator (Next.js + TypeScript + Neon)

A full-stack roadmap generator built as a single Next.js application using TypeScript, NeonDB (PostgreSQL), JWT auth, and Gemini for AI roadmap generation.

## What Changed

This repository has been migrated from a split MongoDB/Express + Vite React architecture to a unified Next.js app.

- Frontend: Next.js App Router + TypeScript + MUI
- Backend: Next.js API routes
- Database: NeonDB (PostgreSQL JSONB) replacing MongoDB
- Auth: JWT with secure HTTP-only cookie
- AI generation: Gemini API called from server-side route

## Tech Stack

- Next.js 15
- TypeScript
- Neon serverless driver (`@neondatabase/serverless`)
- PostgreSQL (Neon)
- MUI
- `jsonwebtoken` + `bcryptjs`

## Prerequisites

- Node.js 20+
- npm
- A Neon PostgreSQL connection string
- Gemini API key

## Environment Variables

Create a root `.env.local` file:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
JWT_SECRET=replace_with_a_strong_secret
GEMINI_API_KEY=your_gemini_api_key
```

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production

```bash
npm run build
npm start
```

## API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Roadmaps

- `POST /api/roadmap/generate`
- `POST /api/roadmap`
- `GET /api/roadmap/history`
- `GET /api/roadmap/:id`

## Data Model (PostgreSQL)

- `users`: `id`, `name`, `email`, `password_hash`, `created_at`
- `roadmaps`: `id`, `user_id`, `title`, `content(JSONB)`, `created_at`

Tables are created automatically at runtime on first request.

## Migration Notes

Legacy folders are still present:

- `Backend/`
- `Frontend/`

They are no longer required for running the migrated app.
