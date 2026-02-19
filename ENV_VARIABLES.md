# NYX — Environment Variables

Add these to your Railway service variables. All variables are for the **backend** service unless noted.

---

## Required — Database

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/nyx` | Railway injects this automatically when you add a Postgres plugin |

## Required — Redis

| Variable | Example | Notes |
|---|---|---|
| `REDIS_URL` | `redis://default:pass@host:6379` | Railway injects this automatically when you add a Redis plugin |

---

## Required — Railway Buckets (Object Storage)

Railway injects these automatically when you attach a Bucket service. You should not need to set them manually in Railway — but set them for local development.

| Variable | Example | Notes |
|---|---|---|
| `RAILWAY_BUCKET_NAME` | `nyx-media` | The bucket name |
| `RAILWAY_BUCKET_ENDPOINT` | `https://bucket.railway.app` | S3-compatible endpoint URL |
| `RAILWAY_BUCKET_ACCESS_KEY_ID` | `AKIA...` | Access key |
| `RAILWAY_BUCKET_SECRET_ACCESS_KEY` | `abc123...` | Secret key |
| `RAILWAY_BUCKET_REGION` | `us-east-1` | Bucket region |

---

## Required — Auth / Security

> **Generate these with:** `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
> Run it twice — once for each secret. Never reuse them.

| Variable | Example | Notes |
|---|---|---|
| `JWT_SECRET` | `a8f3...` (64-char hex) | Signs short-lived access tokens (15 min) |
| `JWT_REFRESH_SECRET` | `b9d1...` (64-char hex) | Signs long-lived refresh tokens (30 days) — must be different |

---

## Required — App Config

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables SSL on DB, disables dev logging |
| `PORT` | `3001` | Railway sets this automatically — you can omit it |
| `CORS_ORIGIN` | `https://nyx.spygroup.dev` | Comma-separated list of allowed origins. Add `http://localhost:5173` for local dev |

---

## Optional — File Uploads

| Variable | Default | Notes |
|---|---|---|
| `MAX_FILE_SIZE_MB` | `1024` | Max upload size in MB (1024 = 1 GB) |

---

## Frontend Service

The frontend is a static Vite build — it has no runtime env vars. All API calls go through `/api` which is proxied to the backend.

If you need to set the API base URL at build time, set:

| Variable | Example | Notes |
|---|---|---|
| `VITE_API_BASE` | `https://nyx-api.railway.app` | Only needed if frontend and backend are on separate domains |

---

## Local Development (.env in backend/)

Copy `backend/.env.example` to `backend/.env` and fill in:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/nyx
REDIS_URL=redis://localhost:6379
RAILWAY_BUCKET_NAME=nyx-media
RAILWAY_BUCKET_ENDPOINT=https://your-bucket.railway.app
RAILWAY_BUCKET_ACCESS_KEY_ID=your_key
RAILWAY_BUCKET_SECRET_ACCESS_KEY=your_secret
RAILWAY_BUCKET_REGION=us-east-1
JWT_SECRET=<generate>
JWT_REFRESH_SECRET=<generate>
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
MAX_FILE_SIZE_MB=1024
```

---

## Railway Deployment Checklist

1. Add **PostgreSQL** plugin → `DATABASE_URL` injected automatically
2. Add **Redis** plugin → `REDIS_URL` injected automatically
3. Add **Bucket** service → `RAILWAY_BUCKET_*` injected automatically
4. Set `JWT_SECRET` and `JWT_REFRESH_SECRET` manually (generate with crypto above)
5. Set `CORS_ORIGIN` to `https://nyx.spygroup.dev`
6. Set `NODE_ENV` to `production`
7. Run database migrations: `node backend/database/migrate.js`
