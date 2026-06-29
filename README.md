# IPMI Manager

A web app for monitoring Dell servers over IPMI — temperatures, fan speeds, power draw, and custom fan control with configurable curves.

## Known working hardware

* R720 with iDRAC7 — Monitoring + fan control
* R620 [#25](/../../issues/25)
* R710 with iDRAC6 [#3](/../../issues/3)
* R730XD iDRAC 8 Enterprise [#87](/../../issues/87)
* R520 [#77](/../../issues/77)
* T430 [#90](/../../issues/90)

If you have it running on different hardware or have ipmi commands for setting fan speeds on different hardware, please submit a PR or open an issue.

## Features

### Monitoring
* Real-time sensor data: temperatures, fan speeds, power (volts/amps/watts)
* Dashboard overview with summary stats (server count, highest temp, total power draw, system status)
* Per-server detail view with sensors organized by category (Temperature, Fans, Power)
* Trend indicators showing whether values are rising or falling
* Color-coded values: green (normal), amber (warning), red (critical) based on thresholds
* Connection status indicator in sidebar (green/amber/red dot)

### Fan Control
* Automatic or manual fan control per server
* Custom fan curve editor with visual graph — drag sliders to set fan speed (%) at each temperature point
* Configurable warning RPM threshold per server
* Fan safety limits (min/max speed) configurable in Settings

### Settings
* **Connections** tab: Add/edit/delete IPMI server connections (name, address, username, password, warning RPM, fan curve)
* **General** tab: Poll interval, log level/retention/max entries, file logging toggle, fan safety limits, Prometheus metrics toggle, autosave interval

### Logging
* Real-time log viewer with level filtering (debug/info/warn/error), search, and export
* Logs written to disk with configurable retention (default 30 days)
* In-memory ring buffer (default 1000 entries)

### Security
* Optional basic auth (`AUTH_USERNAME` / `AUTH_PASSWORD` env vars)
* AES-256-GCM password encryption at rest (`ENCRYPTION_KEY` env var)
* Command injection prevention via `execFile()` (no shell interpolation)
* Input validation on server additions (IP/hostname format, duplicate detection, length limits)

### Other
* Dark IT-admin themed UI with light mode toggle (persisted in localStorage)
* Collapsible sidebar
* Prometheus metrics endpoint at `/metrics`
* REST API endpoint at `/api/logs`
- Responsive design (mobile-friendly card grid)

## Setup

The app is designed to run with docker compose, see the `compose.yml` file in this repo for a sample deployment. No extra configuration except for changing the exposed port should be needed.

### Run with prebuilt image

```
git clone https://github.com/simpleace15/IPMIManager.git
cd IPMIManager
docker compose up -d
```

### Build it yourself

```
git clone https://github.com/simpleace15/IPMIManager.git
cd IPMIManager
docker compose -f compose-dev.yml up -d --build
```

### Local development

```
# Terminal 1 — backend (dev mode, port 8082)
cd backend
npm install
npm run dev

# Terminal 2 — frontend dev server (port 3000, proxies socket.io to 8082)
cd frontend
npm install
npm run dev
```

Navigate to `localhost:3000` for dev mode, or `localhost:8083` for Docker.

## Environment variables

All optional — the app runs with sensible defaults if none are set.

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_USERNAME` | _(none)_ | If set with `AUTH_PASSWORD`, enables basic auth on all routes |
| `AUTH_PASSWORD` | _(none)_ | If set with `AUTH_USERNAME`, enables basic auth on all routes |
| `ENCRYPTION_KEY` | _(none)_ | 32-byte hex/base64 key for AES-256-GCM password encryption at rest. If unset, passwords stored in plaintext (legacy mode) |

## Data storage

| Path | Description |
|------|-------------|
| `data/servers.json` | Server configurations (passwords encrypted if `ENCRYPTION_KEY` set) |
| `data/settings.json` | Application settings |
| `data/logs/ipmimanager-YYYY-MM-DD.log` | Daily log files (if file logging enabled) |

## Tech stack

**Backend:** Node.js, Express, Socket.io v4, prom-client (Prometheus metrics)
**Frontend:** React 18, Vite 5, Ant Design v5, Socket.io-client v4
**Tests:** Vitest (16 backend, 2 frontend)

## Screenshots

Dashboard overview — summary stats + server cards with status badges:

![Dashboard](images/image.png)

Settings → Connections — server management with fan curve editor:

![Settings](https://i.imgur.com/5LeLWMA.png)