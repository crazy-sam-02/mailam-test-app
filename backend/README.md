# Scholar Shield Backend

Minimal Node.js + Express backend for the Scholar Shield Quiz frontend.

Features included:
- Express server with session-based auth (express-session + connect-mongo)
- MongoDB models (User, Test, Attempt) using Mongoose
- Endpoints matching the frontend helper at `frontend/src/lib/api.ts`

Quick start

1. Copy `.env.example` to `.env` and adjust values (MONGO_URI, SESSION_SECRET, REGISTRATION_KEY).
2. Install dependencies:

```powershell
cd backend
npm install
```

3. Seed an admin (optional):

```powershell
npm run seed
```

4. Start the server:

```powershell
npm run dev
```

The backend listens on port 4000 by default and exposes the API under `/api`.
