# Deployment Guide — Vercel + Render

## Architecture

```
User → Vercel (static files: index.html, script.js, player.html, etc.)
         ↓ API calls
       Render (Node.js server: API proxy, ffmpeg downloads)
```

- **Vercel** — free static hosting, serves all frontend files, no cold starts
- **Render** — free web service, runs server.js + ffmpeg, spins down after 15 min idle

---

## Step 1 — Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `gloryfuel-pw` (or anything)
3. Keep **Public**
4. Click **Create repository**

---

## Step 2 — Push project to GitHub

Open PowerShell in the project folder (`E:\gloryfuel pw`) and run:

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gloryfuel-pw.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## Step 3 — Deploy backend to Render

1. Go to https://dashboard.render.com
2. Sign up / Sign in (GitHub login is easiest)
3. Click **New +** → **Web Service**
4. Click **Connect** on your `gloryfuel-pw` repository
5. Fill the form:
   - **Name**: `gloryfuel-pw`
   - **Region**: choose closest to you
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**
6. Click **Advanced** → **Add Environment Variable**:
   - Key: `API_KEY`
   - Value: `gf-pw-secret-api-key-2024`
7. Click **Create Web Service**
8. Wait ~2 minutes for build & deploy
9. Once done, copy your Render URL (looks like `https://gloryfuel-pw.onrender.com`)

---

## Step 4 — Update config.js for Vercel

Edit `E:\gloryfuel pw\config.js` in any text editor.

**Before:**
```js
const API_BASE = '/api';
const API_KEY = '/* GF_KEY */';
```

**After:**
```js
const API_BASE = 'https://pw-gloryfuel.onrender.com/api';
const API_KEY = 'gf-pw-secret-api-key-2024';
```

Replace `https://gloryfuel-pw.onrender.com` with your actual Render URL from Step 3.

---

## Step 5 — Push updated config to GitHub

```powershell
git add config.js
git commit -m "Configure for Vercel deployment"
git push
```

---

## Step 6 — Deploy frontend to Vercel

1. Go to https://vercel.com
2. Sign up / Sign in (GitHub login is easiest)
3. Click **Add New…** → **Project**
4. Find and select `gloryfuel-pw` repository
5. **Framework Preset**: choose **Other**
6. Click **Deploy**
7. Wait ~30 seconds
8. Click **Continue to Dashboard**
9. Your Vercel URL looks like `https://gloryfuel-pw.vercel.app`

---

## Step 7 — Keep Render alive (optional)

Render free web services spin down after 15 minutes of inactivity.

**Solution:** Use UptimeRobot to ping Render every 5 minutes.

1. Go to https://uptimerobot.com → Sign up
2. Click **Add New Monitor**
3. Monitor Type: **HTTP(s)**
4. URL: `https://gloryfuel-pw.onrender.com` (your Render URL)
5. Interval: **5 minutes**
6. Click **Create Monitor**

---

## Done!

You now have:
- **Vercel**: `https://gloryfuel-pw.vercel.app` (fast frontend)
- **Render**: `https://gloryfuel-pw.onrender.com` (backend API)

---

## Updating after changes

Any time you update the code:

```powershell
git add .
git commit -m "Your change description"
git push
```

Render and Vercel auto-deploy from the `main` branch.

## Files that DON'T need re-deploy

- `data/` folder (stats, notification, caches) — stays on Render
- `batches.json` — only changes if you add new batches

## Files that DO need re-deploy

- `server.js` → Render auto-deploys on push
- `config.js`, `script.js`, `index.html`, etc. → Vercel auto-deploys on push
