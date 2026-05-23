# Roadmap Generator

Roadmap Generator is a full-stack Next.js app for creating, revising, and storing personalized learning roadmaps. It uses PostgreSQL on Neon, JWT-based authentication, and Gemini-powered generation on the server side.

## Features

- Create a roadmap from a goal, role, or skill path.
- Upload a resume and generate role or skill-gap guidance.
- Save roadmap history per user.
- Replan or refine an existing roadmap.
- Quiz and bullet helpers for study planning.
- Auth flow with register, login, logout, and session lookup.

## Tech Stack

- Next.js 15 App Router
- TypeScript
- React 19
- MUI
- Neon serverless PostgreSQL
- JWT auth with `jsonwebtoken`
- Password hashing with `bcryptjs`
- Document parsing with `mammoth` and `pdf-parse`

## Requirements

- Node.js 20 or newer
- npm
- A Neon PostgreSQL database URL
- A Gemini API key

## Setup

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Create a root `.env.local` file with these variables:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
JWT_SECRET=your_strong_random_secret
GEMINI_API_KEY=your_gemini_api_key
```

4. Start the development server:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Production Build

Run the production build locally with:

```bash
npm run build
```

If the build passes, you can start the production server with:

```bash
npm start
```

## Deploying to Vercel

1. Push the repository to GitHub.
2. Import the repo into Vercel.
3. Keep the framework preset as Next.js.
4. Add these environment variables in Vercel:
	- `DATABASE_URL`
	- `JWT_SECRET`
	- `GEMINI_API_KEY`
5. Deploy from the `main` branch.

The project already includes a root [vercel.json](vercel.json) and the build command is verified with `npm run build`.

## Scripts

- `npm run dev` - start the local dev server
- `npm run build` - build for production
- `npm start` - run the built app locally
- `npm run lint` - run Next.js linting
- `npm run notify-worker` - run the notification worker script

## API Routes

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Roadmaps

- `POST /api/roadmap/generate`
- `POST /api/roadmap`
- `GET /api/roadmap/history`
- `GET /api/roadmap/[id]`
- `POST /api/roadmap/replan`
- `POST /api/roadmap/job-gap`
- `POST /api/roadmap/quiz`
- `POST /api/roadmap/bullets`

### Supporting APIs

- `GET /api/analytics`
- `POST /api/reminders`
- `POST /api/notifications/send`

## Data Model

The app stores data in PostgreSQL on Neon. Core tables include:

- `users`
- `roadmaps`

Runtime setup creates the required tables on first use.

## Main Pages

- `/` - home dashboard
- `/login` - login screen
- `/register` - registration screen
- `/history` - saved roadmap history

## Notes

- Keep secrets only in local `.env.local` or Vercel environment variables.
- The repository is configured for deployment from the root folder.
