# City Club — Deployment (CloudPanel)

**Domain:** club.trivarta.in **Site user:** trivarta-club **App port:** 3008

This bundle is ready to run: it already contains the database (all members,
logins, settings), every member photo, and the ID-card artwork. The React
frontend is pre-built (`client/dist`) and is served by the Node server, so you
do **not** need to build anything — just install the server dependencies.

---

## 1. Create the site in CloudPanel
- **Sites → Add Site → Create a Node.js Site**
- **Node.js version: 22 or 24** (required — the app uses `node:sqlite`, which needs Node ≥ 22.5; Node 18/20 will NOT work)
- **App Port: 3008**
- Domain: `club.trivarta.in`, Site user: `trivarta-club`

## 2. Upload the files
Upload the contents of this bundle into the site's app directory so you have:

```
<app root>/
├── server/        ← the Node/Express API (run from here)
│   ├── server.js
│   ├── .env       ← already configured for production
│   ├── database/club.db        ← all data
│   └── uploads/photos/*.jpg     ← all member photos
└── client/dist/   ← pre-built frontend (served by the server)
```

## 3. Install server dependencies
```bash
cd server
npm install --omit=dev
```
(No build step needed — `client/dist` is already built. Only the **server** has
runtime dependencies: express, cors, helmet, jsonwebtoken, bcryptjs, multer,
express-rate-limit, dotenv.)

## 4. Set the start command in CloudPanel
- **App Root:** the `server` folder (so the working directory is `server/`)
- **Startup file / command:** `server.js`  (or `npm start`)

> Paths are anchored to the app folder, so it also works if CloudPanel runs from
> the app root — but pointing the App Root at `server/` is cleanest.

## 5. Environment variables (already in `server/.env`)
```
NODE_ENV=production
PORT=3008
JWT_SECRET=<already set to a strong value>
JWT_EXPIRES_IN=24h
CLIENT_ORIGIN=https://club.trivarta.in
```
`DB_PATH` and `UPLOAD_PATH` are intentionally omitted — the server defaults to
`server/database/club.db` and `server/uploads/photos` automatically.

## 6. Start & test
CloudPanel starts the app on port 3008 and reverse-proxies the domain to it.
Then open **https://club.trivarta.in**.

- **Admin login:** `admin` / `Admin@1234` (you'll be forced to change it).
- **Members log in** with their **phone number** (or member number if no phone)
  and password **`password`** (forced change on first login).

## Notes
- Enable HTTPS / Let's Encrypt for the domain in CloudPanel.
- The SQLite file lives in `server/database/`. **Back it up** to preserve data.
- Member photos live in `server/uploads/photos/`. Keep this folder writable so
  new uploads work; back it up alongside the database.
- File uploads are capped at 5 MB; if you use CloudPanel's nginx in front,
  ensure `client_max_body_size` allows at least 5 MB.
