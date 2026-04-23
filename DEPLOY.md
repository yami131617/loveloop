# LoveLoop Deploy Guide

Two services: **backend** (Node.js/Express + Postgres) and **web** (Next.js 15). Both deploy to Railway from this single repo.

## 1. Backend (already live)

Current URL: `https://backend-production-61ee6.up.railway.app`

Environment variables (set in Railway dashboard → backend service → Variables):
- `DATABASE_URL` — auto-set when Postgres plugin is attached
- `JWT_SECRET` — 48+ random hex chars (run `openssl rand -hex 48`)
- `CORS_ORIGIN` — comma-separated origins (e.g. `https://loveloop-web.up.railway.app,https://yourdomain.com`)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — optional but **highly recommended** for production (see below)

On push to `main` Railway auto-deploys. Migrations run automatically on boot (`src/scripts/migrate.js`).

## 2. Web (Next.js)

### Option A — Railway (same project, new service)

1. Open the Railway project that hosts the backend
2. `+ New` → `GitHub Repo` → pick `yami131617/loveloop`
3. In the new service: **Settings → Root Directory** = `web`
4. **Variables**:
   - `NEXT_PUBLIC_API_BASE` = `https://backend-production-61ee6.up.railway.app`
5. **Settings → Networking → Generate Domain** (gives you `loveloop-web-production.up.railway.app`)
6. Add that domain to backend's `CORS_ORIGIN` and redeploy backend.

### Option B — Vercel (recommended for Next.js)

1. Go to vercel.com/new → import `yami131617/loveloop`
2. **Root Directory**: `web`
3. **Environment Variables**: `NEXT_PUBLIC_API_BASE=https://backend-production-61ee6.up.railway.app`
4. Deploy. Vercel gives you `loveloop.vercel.app` (or custom domain).
5. Add the Vercel URL to backend `CORS_ORIGIN`.

## 3. TURN server (video call reliability)

WebRTC peer-to-peer works for ~85% of networks. The rest sit behind strict/symmetric NAT and need a TURN relay. Defaults bundled with the app use the free [Metered.ca](https://metered.ca) TURN (limited bandwidth). To upgrade for production, set in your Vercel web env:

```
NEXT_PUBLIC_TURN_URL=turn:your.turn.host:3478
NEXT_PUBLIC_TURN_USERNAME=...
NEXT_PUBLIC_TURN_CREDENTIAL=...
```

Providers:
- **Twilio** — $0.40/GB, reliable, global edge ([docs](https://www.twilio.com/stun-turn))
- **Xirsys** — $33/mo for 25GB
- **self-host coturn** — free, needs a $5/mo VM
- **Metered.ca** — free tier (default), 500MB/month

## 4. Cloudinary (persistent media storage)

Without Cloudinary, uploaded photos/videos live on Railway's ephemeral disk and vanish on redeploy.

1. Sign up free at https://cloudinary.com/users/register_free (25 GB / month free — enough for MVP)
2. Dashboard → copy **Cloud Name**, **API Key**, **API Secret**
3. Railway backend service → Variables → add all three
4. Backend auto-detects at boot (`[posts] Cloudinary enabled` in logs)
5. All new uploads go to Cloudinary, old `/uploads/*` URLs keep working until next restart

## 4. Quick health-check after deploy

```bash
curl https://your-backend.up.railway.app/ready
# expected: {"ok":true,"db":"up","latencyMs":<low>}

# Register
curl -X POST https://your-backend.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@x.com","password":"password123","username":"test1","display_name":"Test"}'
```

Then open your web URL in a phone browser. Add to home screen for PWA feel.
