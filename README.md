# City Club — Chitradurga (club.trivarta.in)

Membership, dues, payments and ID-card management for the club.

- **Backend:** Node.js + Express + SQLite. Runs on **Node ≥ 18** — uses the
  built-in `node:sqlite` on Node ≥ 22.5, otherwise the `better-sqlite3` fallback
  (installed automatically as an optional dependency)
- **Frontend:** React (Vite, Tailwind) — pre-built into `client/dist`, served by the backend in production
- **App port:** 3008

The repository ships with the live data (`server/database/club.db`), all member
photos (`server/uploads/photos/`), and the ID-card artwork, so a fresh clone is
immediately usable.

## Deploy / update on the server

```bash
# first time
git clone https://github.com/trivartatech/club.git
cd club/server
cp .env.example .env          # then edit JWT_SECRET to a strong value
npm install --omit=dev
pm2 start server.js --name club
pm2 save

# the frontend is already built (client/dist); rebuild only if you change client code:
#   cd ../client && npm install && npm run build
```

`.env` is git-ignored, so pulling code updates never overwrites your server
secrets.

> ⚠️ **The database (`server/database/club.db`) is committed.** A `git pull` that
> brings a newer committed `club.db` will overwrite the live one. On the live
> server, back up `server/database/club.db` before pulling, or run
> `git update-index --skip-worktree server/database/club.db` after the first
> deploy so pulls leave the live database alone.

See **DEPLOY.md** for the full CloudPanel walkthrough.

## Logins
- **Admin:** `admin` / `Admin@1234` (forced password change on first login)
- **Members:** their **phone number** (or member number) / `password`
