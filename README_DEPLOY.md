# Deployment Guide (Next.js + Neon)

This project now runs as a single Next.js service.

## Required Environment Variables

- `DATABASE_URL`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `NODE_ENV=production` (set by most platforms)

## Option 1: Vercel

1. Import the repository into Vercel.
2. Set environment variables in project settings.
3. Deploy.

## Option 2: Docker

```bash
docker build -t roadmap-next:latest .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e GEMINI_API_KEY="..." \
  roadmap-next:latest
```

## Option 3: Any Node Host (Render, Railway, Fly.io)

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm start
```

The app listens on port `3000`.
