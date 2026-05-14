# Byenior 2026 — Live Show Control System

A real-time audience interaction and show control system built with Next.js 16, SQLite, and Server-Sent Events.

---

## Pages

| Route | Description | Access |
|---|---|---|
| `/` | Redirects to `/join` | Public |
| `/join` | Audience participation page (mobile-first) | Public |
| `/screen` | Projected display screen | Public |
| `/remote` | Operator control panel | Password protected |
| `/login` | Password entry | Public |

---

## Features

- **Audience reactions** — emoji floaters, scrolling text messages, image/GIF drops on the screen
- **GIF search** — built-in GIPHY search on the join page
- **Operator remote** — band name management, flame/text visibility toggles, text size slider, RGB color pickers, color presets
- **Real-time sync** — SQLite + Server-Sent Events, state survives server restarts
- **QR code** on the screen page linking to `/join`

---

## Environment Variables

Copy the values below into `.env.local` (development) or pass them via `docker-compose env_file` (production).

```env
# Password for the /remote operator page
REMOTE_PASSWORD=your-password-here

# GIPHY API key — https://developers.giphy.com/ (free tier is enough)
GIPHY_API_KEY=your-giphy-key-here

# Cloudflare Tunnel token — see "Cloudflare Tunnel" section below
# Leave blank if not using the tunnel
TUNNEL_TOKEN=
```

---

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Docker Deployment

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2

### 1. Fill in `.env.local`

Make sure `REMOTE_PASSWORD` and `GIPHY_API_KEY` are set. `TUNNEL_TOKEN` can be left blank if you're not using a public tunnel.

### 2. Build and start

```bash
docker compose up -d --build
```

The app is now available at `http://localhost:3000`.

### 3. Stop

```bash
docker compose down
```

Data (SQLite database and uploaded files) is stored in a named Docker volume (`app-data`) and persists across restarts. To wipe it:

```bash
docker compose down -v
```

---

## Cloudflare Tunnel (Public HTTPS access)

Cloudflare Tunnel exposes the app on a public URL with HTTPS — no open firewall ports needed.

### Setup

1. Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → **Networks** → **Tunnels**
2. Click **Create a tunnel** → choose **Cloudflared** → give it a name
3. Copy the **tunnel token** shown in the install command
4. Paste it into `.env.local`:
   ```env
   TUNNEL_TOKEN=eyJhIjoiMTIz...
   ```
5. In the tunnel's **Public Hostname** settings, add a route:
   - **Subdomain / Domain**: your public hostname (e.g. `show.yourdomain.com`)
   - **Service type**: `HTTP`
   - **URL**: `app:3000`  ← the internal Docker service name and port
6. Start (or restart) the stack:
   ```bash
   docker compose up -d --build
   ```

The `cloudflared` container connects to Cloudflare's edge and forwards traffic to the `app` container over the internal Docker network. No port `3000` needs to be exposed publicly.

---

## Tech Stack

- **Next.js 16** (App Router, React 19)
- **TypeScript 5** / Tailwind CSS v4
- **better-sqlite3** — synchronous SQLite for persistent state
- **Server-Sent Events** — real-time push from server to clients
- **lucide-react** — icons
- **qrcode.react** — QR code generation
- **cloudflared** — Cloudflare Tunnel (Docker)


## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
