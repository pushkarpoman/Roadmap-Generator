Deployment guide — Roadmap app

This repository contains a Vite React frontend in `Frontend/` and an Express backend in `Backend/` that uses MongoDB (Atlas). Below are multiple deployment options. Use the one that best matches your hosting provider and constraints.

Prerequisites
- An account with MongoDB Atlas (or a MongoDB server) and a database/connection string.
- A hosting provider (Render, Railway, Vercel, Netlify, DigitalOcean, Heroku, or a container host).
- Git access to push the repository (if required by the provider).

1) Recommended: Deploy frontend to Vercel (or Netlify) and backend to Render / Railway
- Frontend (Vercel)
  1. In Vercel, create a new project and point it to this repo's `Frontend` directory.
  2. Build command: `npm run build`  
  3. Output directory: `dist`
  4. Environment variables: none required for static build (the frontend reads API base from your runtime config or defaults).

- Backend (Render or Railway)
  1. Create a new Web Service and connect to this repo's `Backend` directory.
  2. Build command: `npm install && cd ../Frontend && npm install && npm run build && cd ../Backend` (or use the Dockerfile provided)
  3. Start command: `node server.js`
  4. Environment variables: set `MONGODB_URI`, `JWT_SECRET`, `PORT` (optional)
  5. If you host frontend separately, make sure CORS in `server.js` allows the frontend origin.

Pros: Easier to iterate (separate deploys), global CDN for frontend, simpler backend scaling.

2) Single-container deploy (Docker) — recommended when you want a single artifact
- We included a multi-stage `Dockerfile` that:
  - Builds the frontend (in `Frontend/`) using `npm run build`.
  - Installs production backend deps and copies the built frontend into `Backend/public`.
  - Runs the backend which serves the static files when `NODE_ENV=production`.

Build locally and run:

```powershell
# from repo root
docker build -t roadmap-app:latest .
# run the container (example: map port 5000)
docker run -e MONGODB_URI="your_mongo_uri" -e JWT_SECRET="your_secret" -p 5000:5000 roadmap-app:latest
```

Push to a container registry and deploy to any container host (DigitalOcean App Platform, AWS ECS, Google Cloud Run, Azure App Service).

3) Deploy to Heroku (single app)
- Add `Procfile` (provided) at repo root: `web: node Backend/server.js`.
- Set up a build pipeline on Heroku to run a build script that builds the frontend into `Backend/public`. Example `heroku-postbuild` (if you move package.json to root) or use the provided Dockerfile.
- Configure `MONGODB_URI` and `JWT_SECRET` in Heroku app settings.

Checklist to make the app deploy-ready (done by me)
- Backend now serves static frontend files when `NODE_ENV=production` (see `Backend/server.js`).
- `Backend/package.json` has `start` script.
- Added `Dockerfile` and `.dockerignore` to build a single container image.
- Added `Backend/.env.example` and `Procfile` for Heroku-style deploys.

Steps I recommend you run next
1. Copy `Backend/.env.example` to `Backend/.env` and update it with your real MongoDB URI and JWT secret.
2. Test locally (dev mode):

```powershell
# Backend dev (requires nodemon installed globally or run with node)
cd Backend
npm install
npm run dev
# In a separate shell: Frontend dev
cd ../Frontend
npm install
npm run dev
```

3. Test production build locally (using Docker recommended):

```powershell
# from repo root
docker build -t roadmap-app:latest .
docker run -e MONGODB_URI="your_mongo_uri" -e JWT_SECRET="your_secret" -p 5000:5000 roadmap-app:latest
# open http://localhost:5000
```

4. Choose hosting provider
- If you want fast global frontend distribution: Vercel (frontend) + Render (backend).
- If you prefer a single artifact: push Docker image to registry and deploy Container on your provider.

If you'd like, I can:
- Add a small script in the repo root to do the build-and-copy for non-Docker deploys.
- Generate provider-specific instructions for Render/Vercel/Azure/GCP.
- Help you configure environment variables on the hosting provider.

Tell me which provider you prefer and I will walk you through every console click and command (or I can automate config files where possible).