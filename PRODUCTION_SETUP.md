# Dream Paintings — Production Deployment Guide

## Architecture
- **Backend** → Render (Node.js + Express)
- **Frontend** → Vercel (React + Vite)
- **Database** → Neon (PostgreSQL)
- **Images** → Cloudinary

---

## Step 1 — Push to GitHub

Make sure your repo is on GitHub. The `.gitignore` protects:
- `backend/.env` (your real secrets)
- `frontend/.env` and `frontend/.env.local`
- `node_modules/`, `dist/`

**Do NOT commit real secrets. Use environment variables on each platform.**

---

## Step 2 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node

4. Add these Environment Variables in Render dashboard:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | your Neon connection string |
| `JWT_SECRET` | a strong random string (min 32 chars) |
| `FRONTEND_URL` | your Vercel URL (e.g. `https://dream-paintings.vercel.app`) |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | from Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | from Cloudinary dashboard |
| `RAZORPAY_KEY_ID` | from Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | from Razorpay dashboard |
| `ENCRYPTION_KEY` | a 32-character random string |
| `DATABASE_SSL` | `true` |

5. Deploy. Note your backend URL: `https://dream-paintings-backend.onrender.com`

---

## Step 3 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

4. Add these Environment Variables in Vercel dashboard:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://dream-paintings-backend.onrender.com/api` |

> The `frontend/.env.production` file already sets this, but setting it in Vercel dashboard overrides it and is more secure.

5. Deploy. Your site will be live at `https://dream-paintings.vercel.app`

---

## Step 4 — Update FRONTEND_URL on Render

After Vercel gives you your domain:
1. Go to Render → your backend service → Environment
2. Update `FRONTEND_URL` to your exact Vercel URL
3. Redeploy the backend (or it auto-redeploys)

---

## Step 5 — Verify Everything Works

- [ ] Visit your Vercel URL — homepage loads
- [ ] Register a new account
- [ ] Login works
- [ ] Gallery loads paintings
- [ ] Image uploads work (Cloudinary)
- [ ] Place a test order
- [ ] Admin panel accessible at `/super-admin-portal-xyz`
- [ ] Chat / Socket.IO connects (check browser console for errors)

---

## Common Issues

### "Network Error" on frontend
- Check `VITE_API_URL` is set correctly in Vercel
- Make sure backend is running on Render (free tier sleeps after inactivity)

### CORS errors
- Make sure `FRONTEND_URL` on Render matches your exact Vercel domain (no trailing slash)

### Socket.IO not connecting
- Render free tier supports WebSockets — no extra config needed
- Check browser console: the socket URL should point to your Render backend

### Database errors on first boot
- The app auto-creates all tables on startup via `initDB()`
- Check Render logs for `✅ Database initialized`

### Render free tier cold starts
- Free Render services sleep after 15 min of inactivity
- First request after sleep takes ~30 seconds
- Upgrade to paid tier or use a cron job to ping `/api/health` every 10 min

---

## Admin Account Setup

After deployment, run this once to create your admin account:

```bash
# On Render: go to your service → Shell tab
node createAdmin.js
```

Or set these env vars before running:
```
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=yourpassword
ADMIN_NAME=Admin
```
