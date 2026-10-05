# DHSGU Campus Bus Tracker

Real-time campus transit tracking, routing, and safety assistance for Dr. Harisingh Gour Vishwavidyalaya, Sagar

DHSGU Campus Bus Tracker is a demonstration web application for students, faculty, and drivers at Dr. Harisingh Gour Vishwavidyalaya (DHSGU). It brings together a live campus map, route and place information, service alerts, a driver update panel, GPS route recording, and a transit-and-safety assistant. It is designed to demonstrate a campus mobility workflow; its seeded routes, vehicle positions, stops, schedules, and place coordinates are not official university operations data.

## Live Demo

| Service | URL |
| --- | --- |
| Frontend | [campus-bus-tracking-app-dhsgu-final.vercel.app](https://campus-bus-tracking-app-dhsgu-final.vercel.app) |
| Backend API | [dhsgu-bus-api.onrender.com](https://dhsgu-bus-api.onrender.com) |
| API health check | [dhsgu-bus-api.onrender.com/api/health](https://dhsgu-bus-api.onrender.com/api/health) |

The Render free-tier backend may take up to 60 seconds to wake after inactivity. Demo driver PIN: `dhsgu2026`.

## Key Features

### Google-Style Live Map

- Muted OpenStreetMap tiles provide the Leaflet basemap.
- Campus route geometry is drawn as a blue cased line with start, intermediate, and destination waypoint markers.
- An itinerary panel presents route distance and an estimated travel time.
- Independent Stops and Campus places controls show or hide those map layers.
- An animated BUS-101 demo marker moves along the route; backend bus locations refresh every 10 seconds.

### Real-Road Routing

- OSRM driving directions are requested for each consecutive stop pair.
- A two-stage detour guard rejects implausibly long road segments, first allowing at most `max(2.2 x direct distance, direct distance + 3 km)`, then retrying with a relaxed `max(3.5 x direct distance, direct distance + 5 km)` bound.
- When both candidates fail or OSRM is unavailable, that segment uses a straight-line fallback.
- Estimated itinerary time is derived from route distance at a nominal 20 km/h; it is an estimate, not a live traffic prediction.

### Real-Time GPS Route Recorder

- The Driver Panel records browser GPS fixes with `watchPosition`.
- It keeps fixes with accuracy up to 30 metres and at least 10 metres between retained points, with a 2,000-point cap.
- Recorded latitude/longitude pairs can be copied or exported as JSON; the trace is browser-side and is not saved to the backend.

### Driver Panel

- A demo PIN gate protects bus location and status updates.
- Drivers can select a bus, enter coordinates or use browser geolocation, and choose its status.
- The panel can broadcast alerts and deactivate active alerts.
- GPS route recording and JSON export are available in the same panel.

### Alert Lifecycle

- The interface gives `DELAY`, `ROUTE_CHANGE`, `EMERGENCY`, and `GENERAL` alerts distinct colors and visual treatments. The backend and Driver Panel also accept `CANCELLATION`.
- New alerts appear as live toasts; the Live Map also displays an active-alert banner.
- The Alerts page filters by Active, Past, or All, with an additional alert-type filter.
- Emergency notices surface the Campus Security Control Room helpline: **07582-265810**.

### AI Assistant

- The Flask API calls Pollinations.ai as its primary, keyless text assistant.
- If the service fails or returns no answer, a deterministic offline, keyword-based knowledge fallback provides transit guidance and safety contacts.
- Safety-related replies direct users to the Campus Security Control Room helpline: **07582-265810**.

### Role-Aware UI

- A Student / Faculty / Driver selector changes the role's default landing page.
- Students land on the Live Map, Faculty on Routes, and Drivers on the Driver Panel.
- This is a navigation convenience, not server-side identity or access control.

## Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React | Component-based browser application and role-aware pages. |
| Frontend tooling | Vite | Local development server and production build. |
| Interactive maps | Leaflet, React Leaflet | Basemap, route geometry, bus and place markers. |
| Backend | Flask | REST API, validation, driver updates, and chat proxy/fallback. |
| Database | SQLite | Routes, stops, buses, alerts, campus places, and university facts. |
| Production server | Gunicorn | WSGI server used to run Flask on Render. |
| Road routing | OSRM | Per-segment driving geometry and distance. |
| Assistant | Pollinations.ai | Keyless text response service, called by the backend. |
| Map tiles | OpenStreetMap | Raster basemap tiles and attribution. |
| Frontend tests | Vitest, Testing Library | Component, page, service, map, and GPS behavior tests. |
| Backend tests | Python `unittest` | API validation, PIN behavior, seeding, and chat fallback tests. |

## Architecture

```text
                                                 +----------------------+
                                                 |   OpenStreetMap tiles|
                                                 +----------^-----------+
                                                                        |
+----------------+   REST   +-------+--------+   SQL   +-------------------+
| Browser SPA    +--------->| Flask API      +-------->| SQLite            |
| Vercel         |          | Render/Gunicorn|         | startup reseeding|
+-------+--------+          +---+----------+-+         +-------------------+
                |                       |          |
                | OSRM routing          | chat     | bus/alert/place/route data
                v                       v          |
    +-----------+          +-------------+   |
    | OSRM      |          | Pollinations|   |
    +-----------+          +-------------+   |
```

The browser loads map tiles directly from OpenStreetMap and requests road geometry from OSRM, while application data and driver writes go through the Flask REST API. The backend reads and writes SQLite and reseeds demo records when the application starts; on an ephemeral host, this restores demo data after a restart but does not make runtime changes durable. Chat requests are proxied by Flask to Pollinations.ai, with a local fallback if the remote request fails. The Live Map refreshes bus data every 10 seconds and skips overlapping refreshes; alert toasts poll separately every 30 seconds.

## REST API Reference

All paths below include the `/api` prefix. The listed read and chat routes do not require a PIN. Write routes marked **Demo PIN** require `X-Driver-Pin` unless `DRIVER_PIN` is explicitly set to an empty value. The health endpoint is defined in `backend/app.py`; other endpoints are defined in `backend/routes.py`.

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Report API service health. | None |
| `POST` | `/api/chat` | Get a Pollinations answer or offline fallback. | None |
| `GET` | `/api/university` | Return university facts as a key/value object. | None |
| `GET` | `/api/places` | List campus places; optional `category` filter. | None |
| `GET` | `/api/places/{place_id}` | Return one campus place. | None |
| `GET` | `/api/routes` | List routes. | None |
| `GET` | `/api/routes/{route_id}` | Return a route and its stops. | None |
| `GET` | `/api/buses` | List buses and associated route names. | None |
| `GET` | `/api/buses/{bus_id}` | Return one bus. | None |
| `POST` | `/api/buses/{bus_id}/location` | Validate and update bus coordinates and timestamp. | Demo PIN |
| `POST` | `/api/buses/{bus_id}/status` | Update bus status. | Demo PIN |
| `GET` | `/api/alerts` | List alerts, newest first. | None |
| `POST` | `/api/alerts` | Create an alert. | Demo PIN |
| `PATCH` | `/api/alerts/{alert_id}` | Set an alert's active state. | Demo PIN |
| `POST` | `/api/alerts/{alert_id}/deactivate` | Deactivate an alert. | Demo PIN |

## Project Structure

```text
campus-bus-tracking/
|-- backend/
|   |-- app.py                 Flask app, CORS, startup seeding, health route
|   |-- routes.py              REST handlers, validation, PIN and chat fallback
|   |-- database.py            SQLite schema, connections, compatibility migrations
|   |-- seed.py                Demo data creation and refresh
|   |-- requirements.txt       Python runtime dependencies
|   `-- tests/                 Backend unittest suite
|-- frontend/
|   |-- package.json           npm scripts and dependencies
|   |-- vercel.json            SPA deep-link rewrite
|   `-- src/
|       |-- App.jsx            Shared shell and client-side routes
|       |-- components/        Navigation, alerts, badges, chat, shared UI
|       |-- config/            University details and role landing paths
|       |-- pages/             Home, routes, Live Map, places, alerts, driver UI
|       |-- services/          API, OSRM routing, geolocation, GPS and data logic
|       `-- __tests__/         Vitest suite
`-- docs/                      Build report, API docs, demo guide, source reference
```

## Getting Started (Local)

Requires Python and Node.js/npm. In PowerShell, start the backend from the repository root:

```powershell
cd campus-bus-tracking\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

The API listens on `http://127.0.0.1:5000` by default and seeds the local SQLite database at startup. In a second terminal, start the frontend:

```powershell
cd campus-bus-tracking\frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

### Environment Variables

| Variable | Read by | Default / behavior |
| --- | --- | --- |
| `PORT` | Flask development entry point | `5000`; hosting supplies the production port. |
| `FLASK_DEBUG` | Flask development entry point | Debug is off unless the value is `1`. |
| `FRONTEND_ORIGIN` | Backend CORS setup | Unset; optionally adds one allowed frontend origin. |
| `DRIVER_PIN` | Driver-write API checks | Unset uses `dhsgu2026`; an explicit empty value disables the PIN check. |
| `VITE_API_BASE_URL` | Frontend Axios client | `http://127.0.0.1:5000`. Set to the deployed API base URL for production. |
| `GEMINI_API_KEY` | Not read by current application code | Legacy documentation/configuration reference only. Current chat uses Pollinations.ai and does not require a Gemini key. |

## Testing

Run the backend and frontend suites from the repository root:

```powershell
cd campus-bus-tracking\backend
python -m unittest discover -s tests -v
cd ..\frontend
npm test
```

The verified suite totals are **21 backend unittest cases** and **76 frontend Vitest tests across 27 test files**. The backend suite covers API behavior and validation, PIN-protected writes, schema compatibility and seeding, and Pollinations/offline chat behavior. The frontend suite covers pages and role routing, API services, alert lifecycle, map rendering and routing fallbacks, polling and bus simulation, GPS filters/export, and assistant UI states.

## Deployment

Deployment settings are managed in the hosting dashboards; the repository does not contain provider deployment manifests beyond the Vercel SPA rewrite. Configure the providers' Git integration to auto-deploy on push if desired.

### Vercel Frontend

- Root directory: `campus-bus-tracking/frontend`
- Build command: `npm run build`
- Output directory: `dist`
- `frontend/vercel.json` rewrites all paths to `/index.html` so React Router deep links load correctly.
- Set `VITE_API_BASE_URL` to `https://dhsgu-bus-api.onrender.com` in the Vercel project settings.
- Enable auto-deploy on push in the Vercel dashboard's Git integration.

### Render Backend

- Root directory: `campus-bus-tracking/backend`
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app --bind 0.0.0.0:$PORT`
- The application calls the demo seeder at startup.
- The free-tier filesystem is ephemeral: runtime SQLite writes can be lost after a restart or redeploy. Startup seeding restores demo rows while preserving verified rows in a persistent database.
- Configure auto-deploy on push through the Render dashboard's Git integration.

## Engineering Highlights

1. **CORS domain correction:** The backend allow-list includes local development origins, both deployed Vercel frontend domains, and an optional `FRONTEND_ORIGIN` setting so browser API calls can be permitted for the configured deployment.
2. **SPA deep-link 404 fix:** The Vercel rewrite sends client-side paths such as `/live-map` and `/driver-panel` to the SPA entry point instead of returning a hosting-level 404.
3. **Ephemeral database recovery:** Startup seeding recreates unverified demo records after SQLite storage is lost, while preserving verified records when they remain available.
4. **OSRM detour guard:** Each leg is checked independently against strict and relaxed distance bounds; unavailable or unreasonable road geometry falls back to a direct segment.
5. **Keyless AI activation:** Flask calls Pollinations.ai without an application API key and falls back to local keyword-based replies when the service is unavailable.

## Security & Limitations

- SQL values derived from requests are passed as SQLite parameters. This avoids assembling request values into SQL text.
- CORS is restricted to the configured local and Vercel origins, with an optional `FRONTEND_ORIGIN` addition.
- The driver PIN is a public demo safeguard, not authentication. The default `dhsgu2026` PIN is included for the demonstration; the backend has no user identity or role-based authorization, and an empty `DRIVER_PIN` disables the check. Do not use this mechanism to protect production operations.
- **Demo data - not official.** Routes, stops, timings, bus records, and campus coordinates are demonstration data and are not verified DHSGU operations information. Do not use the app for real dispatch, navigation, or emergency response.
- The assistant is not an emergency service. For immediate campus safety assistance, call **07582-265810**.
- Historical docs and the backend dependency list contain Gemini references, but the current chat implementation does not read `GEMINI_API_KEY`; it uses Pollinations.ai and its offline fallback.
- Public OpenStreetMap tiles, OSRM routing, Pollinations availability, and hosted free-tier cold starts depend on external services.

## Roadmap

- Multi-bus fleet tracking.
- Machine-learning-based ETA estimates.
- Integration with verified, official university transit data.
- Native mobile application.

## Documentation

- [Technical Build Report](docs/TECHNICAL_BUILD_REPORT.md)
- [Source Code and Documentation](docs/SOURCE_CODE_AND_DOCUMENTATION.md)
- [Demo Day Guide](docs/DEMO_DAY.md)
- [CodeCraft Challenge presentation](docs/CodeCraft_Challenge_DHSGU_Campus_Bus_Tracker.pptx)
- [REST API documentation](docs/api-documentation.md)

## Author

**Suvam**, BCA Undergraduate. Built for the **CodeCraft Challenge**.
