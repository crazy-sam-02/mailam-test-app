# Deployment Guide for Scholar Shield Quiz

## Pre-Requisites

Before deploying, ensure you have the following configured.

### Environment Variables

#### Backend (`backend/.env`)

These variables must be set in your backend hosting environment (e.g., Render, Railway, Vercel).

- `PORT`: 8000 (or provided by host)
- `MONGO_URI`: Your MongoDB connection string (e.g., MongoDB Atlas).
- `SESSION_SECRET`: A long, random string for securing sessions.
- `FRONTEND_ORIGIN`: Comma-separated list of frontend URLs (e.g., `https://mailam-enginering-college-test.netlify.app,https://your-custom-domain.com`).
- `ALLOWED_ORIGINS`: Comma-separated list used by CORS; include Netlify domain(s), custom domain(s), and local dev (e.g., `http://localhost:5173`). Netlify/Render preview subdomains are also allowed by regex.
- `NODE_ENV`: Set to `production`.
- `JWT_SECRET`: Long random string to sign JWTs.
- `JWT_EXPIRES_IN`: Token TTL (e.g., `7d`).

##### AI Configuration (Backend)

The backend supports multiple AI providers for question generation (used by `POST /api/tests/upload`).

- `AI_PROVIDER`: `gemini` (default), `openai`, `groq`, or `mock`.
- `GOOGLE_API_KEY`: Required when `AI_PROVIDER=gemini`.
- `GEMINI_MODEL`: Optional (default: `gemini-1.5-flash`).
- `OPENAI_API_KEY`: Required when `AI_PROVIDER=openai`.
- `OPENAI_MODEL`: Optional (default: `gpt-4o-mini`).
- `GROQ_API_KEY`: Required when `AI_PROVIDER=groq`.
- `GROQ_MODEL`: Optional.

Safety/performance limits:

- `UPLOAD_MAX_BYTES`: Max uploaded file size in bytes (default 10MB).
- `AI_MAX_INPUT_CHARS`: Max extracted text chars sent to AI (default 30000).

To enable a specific OpenAI model for all clients, set:

- `AI_PROVIDER=openai`
- `OPENAI_MODEL=gpt-5.1-codex-max`
- `OPENAI_API_KEY=...`

#### Frontend (`frontend/.env`)

These variables must be set in your frontend hosting environment (e.g., Vercel, Netlify).

- `VITE_API_BASE_URL`: The full URL to your deployed backend API (e.g., `https://scholar-shield-backend.onrender.com/api`).
  - _Note_: Ensure it ends with `/api` and has no trailing slash.

## Build steps

### Backend

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start command:
   ```bash
   npm start
   ```

### Frontend

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build command:
   ```bash
   npm run build
   ```
   - This generates a `dist/` folder containing static files.
3. Serve command (if handling serving manually):
   - Serve the `dist/` folder. Use strict rewrites for SPA (redirect all 404s to `index.html`).

## Post-Deployment Checks

1. **Verify API Connection**: Open the site, check the Network tab. Ensure requests go to your production backend URL, not `localhost`.
2. **CORS Errors**: If you see CORS errors, ensure `ALLOWED_ORIGINS` (and `FRONTEND_ORIGIN`) include your exact frontend URL(s) with correct scheme (`https://`) and no trailing slash. Previews on Netlify/Render are supported automatically.
3. **Auth (JWT)**: The app now uses JWT in the `Authorization: Bearer <token>` header. No cookies are required. Ensure `JWT_SECRET` is set in the backend environment.
4. **Database**: Ensure your IP whitelist on MongoDB Atlas (if used) allows connections from your hosting provider (allow `0.0.0.0/0` if unsure).

## SEO & Performance Features

- **Sitemap**: A `sitemap.xml` is included in `public/`.
- **Meta Tags**: SEO meta tags are configured in `index.html`.
- **Lazy Loading**: Route components are lazy-loaded for faster initial render.
- **Security**: Backend typically uses `helmet` for security headers and `compression` for smaller payloads.

## Deployment Platform Guides

### Option A: Render.com (Recommended)

This project includes a `render.yaml` file for "Infrastructure as Code" deployment.

1.  Push your code to a GitHub repository.
2.  Create a [Render](https://render.com) account.
3.  Go to **Blueprints** -> **New Blueprint Instance**.
4.  Connect your repository.
5.  Render will automatically detect the `render.yaml`.
6.  **Fill in the Environment Variables**:
    - `MONGO_URI`: Your MongoDB connection string.
    - `FRONTEND_ORIGIN`: Once the services are created, come back and update this with your frontend URL.
7.  Click **Apply**. Render will deploy both the backend (Node service) and frontend (Static site) automatically.

### Option B: Railway.app

1.  Push your code to GitHub.
2.  Login to [Railway](https://railway.app).
3.  New Project -> Deploy from GitHub repo.
4.  Railway usually auto-detects folders. If not, add two services:
    - **Backend**: Set Root Directory to `backend/`.
    - **Frontend**: Set Root Directory to `frontend/`.
5.  Variables:
    - Set `MONGO_URI` and `SESSION_SECRET` in the Backend service.
    - Set `VITE_API_BASE_URL` in the Frontend service (pointing to your Backend URL).

### Option C: Manual (VPS/Heroku)

**Backend (Heroku):**

1.  Navigate to `backend/`.
2.  `heroku create`
3.  Set vars: `heroku config:set MONGO_URI=... NODE_ENV=production`
4.  Deploy: `git push heroku main` (or `git subtree push --prefix backend heroku main` if from root).

**Frontend (Vercel/Netlify):**

1.  Import the repository.
2.  Set Root Directory to `frontend`.
3.  Build Command: `npm run build`
4.  Output Directory: `dist`
5.  Environment Variables: `VITE_API_BASE_URL` = your backend URL (`.../api`).
