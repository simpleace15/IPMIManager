# IPMI Manager

Monitor and control Dell PowerEdge servers via IPMI — temperatures, fan speeds, power draw, and custom fan curves with a clean dark-themed web UI.

![Dashboard](images/image.png)

## What it does

- **Live sensor monitoring** — temps, fan RPM, power (volts/amps/watts) polled every 30 seconds
- **Custom fan curves** — define a temperature-to-fan-speed curve per server, drag sliders to set each point
- **Dashboard overview** — summary stats (servers online, highest temp, total power draw) plus clickable server cards with color-coded status badges
- **Server detail view** — sensors grouped into Temperature / Fans / Power sections with trend arrows and threshold-based color coding (green / amber / red)
- **Settings page** — Connections tab (add/edit/delete servers, configure fan curves) + General tab (polling interval, logging, fan safety limits, Prometheus, autosave)
- **Log viewer** — real-time log streaming with level filter, search, export, and clear
- **Dark / light theme** — toggle in the sidebar, persisted across sessions
- **Prometheus metrics** — scrape-ready endpoint at `/metrics`
- **Password encryption** — AES-256-GCM at rest (optional)
- **Optional basic auth** — protect the UI with username/password

## Supported hardware

Tested with `ipmitool` on Dell iDRAC:

| Model | iDRAC | Status |
|-------|-------|--------|
| R720 | iDRAC7 | Monitoring + fan control |
| R620 | — | Confirmed [#25](/../../issues/25) |
| R710 | iDRAC6 | Confirmed [#3](/../../issues/3) |
| R730XD | iDRAC8 Enterprise | Confirmed [#87](/../../issues/87) |
| R520 | — | Confirmed [#77](/../../issues/77) |
| T430 | — | Confirmed [#90](/../../issues/90) |

Running on something else? Open an issue or submit a PR.

## Quick start

### Docker (prebuilt image)

```bash
git clone https://github.com/simpleace15/IPMIManager.git
cd IPMIManager
docker compose up -d
```

Then open `http://localhost:8083`.

### Docker (self-build)

```bash
git clone https://github.com/simpleace15/IPMIManager.git
cd IPMIManager
docker compose -f compose-dev.yml up -d --build
```

### Local development

Two terminals:

```bash
# Terminal 1 — backend (port 8082)
cd backend
npm install
npm run dev

# Terminal 2 — frontend (port 3000, proxies to backend)
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Configuration

### Servers

Add servers in the UI under **Settings → Connections**. Each server needs:

- **Name** — display label
- **Address** — iDRAC IP or hostname
- **Username** — iDRAC user (usually `root`)
- **Password** — iDRAC password
- **Warning RPM** — fan speed threshold below which the server shows a warning state

Optionally enable **Manual Fan Control** and configure a custom fan curve.

### Environment variables

All optional — defaults work out of the box.

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_USERNAME` | unset | Enables basic auth when set with `AUTH_PASSWORD` |
| `AUTH_PASSWORD` | unset | Enables basic auth when set with `AUTH_USERNAME` |
| `ENCRYPTION_KEY` | unset | 32-byte hex/base64 key for AES-256-GCM password encryption. If unset, passwords stored in plaintext |

### Settings (in-app)

Adjustable under **Settings → General**:

| Setting | Default | Description |
|---------|---------|-------------|
| Poll interval | 30000 ms | How often sensors are polled |
| Log level | info | Minimum log level (debug/info/warn/error) |
| Max log entries | 1000 | In-memory log ring buffer size |
| Log retention | 30 days | Auto-delete log files older than this |
| File logging | On | Write logs to `data/logs/` |
| Min fan speed | 0% | Floor for manual fan control |
| Max fan speed | 100% | Ceiling for manual fan control |
| Prometheus | On | Expose `/metrics` endpoint |
| Autosave | 60000 ms | How often server config is saved to disk |

## Data storage

```
data/
├── servers.json          # Server configs (passwords encrypted if ENCRYPTION_KEY set)
├── settings.json         # App settings
└── logs/
    └── ipmimanager-YYYY-MM-DD.log
```

## API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Web UI |
| `GET /info` | Health check |
| `GET /metrics` | Prometheus metrics |
| `GET /api/logs` | JSON log entries |

Socket.io events: `servers`, `sensordata`, `getServers`, `updateServer`, `addServer`, `deleteServer`, `getSettings`, `updateSettings`, `getLogs`, `clearLogs`.

## Tech stack

- **Backend:** Node.js, Express, Socket.io v4, prom-client
- **Frontend:** React 18, Vite 5, Ant Design v5, Socket.io-client v4
- **Tests:** Vitest — 16 backend, 2 frontend
- **Docker:** Multi-stage build, `ipmitool` installed in image

## Development

```bash
# Run tests
cd backend && npx vitest run
cd frontend && npx vitest run

# Production build
cd frontend && npx vite build

# Format code
cd backend && npm run format
cd frontend && npm run format
```

## Credits

Forked from [Danielv123/serverManager](https://github.com/Danielv123/serverManager). UI/UX redesigned, backend hardened with security fixes, encryption, logging, and settings.