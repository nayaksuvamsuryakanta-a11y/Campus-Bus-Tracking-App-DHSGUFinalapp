# DHSGU Campus Bus Tracker - Technical Build Report

**Repository:** `campus-bus-tracking`

**Report basis:** current application source, manifests, tests, deployment documentation, and recent repository history. Version strings below reproduce manifest declarations; ranges are not claims about the exact package versions installed at runtime.

## 1. Executive Summary

The DHSGU Campus Bus Tracker is a demonstration web application for Dr. Harisingh Gour Vishwavidyalaya (DHSGU). It serves students and faculty looking for route and campus-place information, and drivers who need to update a vehicle's reported location or status. It is a hackathon demonstration, not an official university dispatch or safety system; route and bus data are seeded demo records.

Headline capabilities include a Leaflet live map with ten-second backend location refresh, OSRM real-road routing with guarded straight-line fallback, an animated BUS-101 demo marker, a Pollinations.ai assistant with an offline reply path, browser-side GPS route recording and export, route/place browsing, alerts, and a PIN-gated driver panel. The assistant and UI also surface the Campus Security Control Room's supplied 24x7 helpline, 07582-265810.

## 2. Languages Used

| Language | Role | Main files |
| --- | --- | --- |
| Python | Flask API, SQLite access and migrations, seed logic, backend tests | `backend/app.py`, `backend/routes.py`, `backend/database.py`, `backend/seed.py`, `backend/tests/test_university_api.py` |
| JavaScript / JSX | React components and pages, API clients, map routing and GPS recording, Vite configuration and tests | `frontend/src/App.jsx`, `frontend/src/pages/*.jsx`, `frontend/src/components/*.jsx`, `frontend/src/services/*.js`, `frontend/vite.config.js`, `frontend/src/__tests__/*` |
| HTML | SPA document shell and mount point | `frontend/index.html` |
| CSS | Map controls and marker presentation; remaining app styling is supplied by Bootstrap | `frontend/src/pages/LiveMapPage.css`, `frontend/src/pages/DriverPanelPage.css`, Bootstrap stylesheet import in `frontend/src/App.jsx` |
| SQL | SQLite DDL and data queries, embedded in Python | `backend/database.py`, `backend/routes.py`, `backend/seed.py` |

## 3. Frameworks & Libraries

The following are the exact version declarations in `backend/requirements.txt` and `frontend/package.json`. Python entries use PEP 440 ranges; npm entries use semver ranges. No resolved versions are inferred here.

| Framework / library | Declared version | Purpose |
| --- | --- | --- |
| Flask | `>=3.0,<4.0` | HTTP application and REST routes. |
| Flask-Cors | `>=4.0,<6.0` | Apply the backend's API origin allow-list. |
| Gunicorn | `>=23.0,<24.0` (non-Windows) | Production WSGI server described for Render. |
| google-generativeai | `>=0.8,<1.0` | Still declared in requirements, but not imported by the current Pollinations-based chat route. |
| React / React DOM | `^19.2.8` | Frontend component model and browser rendering. |
| Vite | `^8.3.0` | Frontend development server and production bundler. |
| `@vitejs/plugin-react` | `^6.1.1` | React integration for Vite. |
| React Router DOM | `^7.18.4` | Client-side routes and navigation. |
| Leaflet / React Leaflet | `^1.9.4` / `^5.0.0` | Interactive map rendering and React map components. |
| Axios | `^1.20.0` | Browser-to-Flask HTTP requests, timeout, and PIN header interceptor. |
| Bootstrap | `^5.3.8` | Layout, forms, buttons, badges, and baseline styling. |
| Vitest | `^5.0.3` | Frontend test runner. |
| Testing Library React / user-event / jest-dom | `^16.3.3` / `^14.6.7` / `^7.0.1` | Component rendering, user interaction, and DOM assertions. |
| jsdom | `^30.1.1` | Browser-like environment for frontend tests. |
| Oxlint | `^1.81.0` | Frontend lint command (`npm run lint`). |

## 4. System Architecture

```text
                    +-----------------------> OpenStreetMap tile service
                    |                           (HTTPS raster tiles)
                    |
+-------------------+------------------+
| Browser: React SPA / React Router    |-------> OSRM public routing API
| Leaflet UI, browser geolocation      |          (HTTPS route geometry)
+-------------------+------------------+
                    | HTTPS in deployment; local API defaults to HTTP
                    v
          +---------+----------+
          | Flask REST API     |-----------> Pollinations.ai text endpoint
          | validation, PIN,   |               (HTTPS; 12 s timeout)
          | fallback responses|
          +---------+----------+
                    |
                    v
              +-----+-----+
              | SQLite    |
              | demo data |
              +-----------+
```

The browser owns presentation, view state, external map/routing calls, and GPS collection. The Flask layer owns request validation, write authorization, response construction, AI network access, and offline chat fallback. SQLite stores app records. The GPS trace is held in the frontend service and exported by the browser; it is not sent to or persisted by the backend.

## 5. Backend Build Details

`backend/app.py` creates the Flask app, calls `seed_database()` during module startup, registers the `api` blueprint under `/api`, configures CORS, and exposes `/api/health`. `routes.py` contains request validation and endpoint handlers. `database.py` initializes SQLite tables, enables foreign keys on connections, and applies small compatibility migrations. `seed.py` creates or refreshes unverified demo rows while preserving verified records.

### REST API

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | Health/status response. |
| `POST /api/chat` | Pollinations response with offline knowledge-base fallback. |
| `GET /api/university` | University key/value information object. |
| `GET /api/places` | List campus places; optional `category` filter. |
| `GET /api/places/<place_id>` | Fetch one place. |
| `GET /api/routes` | List routes. |
| `GET /api/routes/<route_id>` | Fetch a route and its ordered stops. |
| `GET /api/buses` | List buses with route names and locations. |
| `GET /api/buses/<bus_id>` | Fetch one bus. |
| `POST /api/buses/<bus_id>/location` | Update validated coordinates and timestamp; PIN-protected. |
| `POST /api/buses/<bus_id>/status` | Update a validated bus status; PIN-protected. |
| `GET /api/alerts` | List alerts, newest first. |
| `POST /api/alerts` | Create a validated alert; PIN-protected. |
| `PATCH /api/alerts/<alert_id>` | Change alert active state; PIN-protected. |

### SQLite schema and relationships

| Table | Main contents and relationship |
| --- | --- |
| `routes` | Route name, description, service times, and verification flag. Parent of stops and optionally buses. |
| `stops` | Ordered stop coordinates/times; `route_id` references `routes.id` (one route to many stops). |
| `buses` | Bus number, status, latest location and timestamp; nullable `route_id` references `routes.id` (one route may serve many buses). |
| `alerts` | Alert text, category, active/demo flags, and creation time. Independent table. |
| `campus_places` | Place name, category, description, optional coordinates, verification flag, and notes. Independent table; this is the actual table name for places. |
| `university_info` | University key/value facts. Independent table. |

The app resolves `campus_bus.db` beside `database.py`. Startup seeding removes and recreates demo-only records, leaves verified records intact, upserts the demo route/stops/bus/places/alert, and inserts university facts without overwriting existing keys. This makes the demo recover after Render's ephemeral filesystem loses its database; SQLite changes are not durable across restarts or redeployments on that storage tier.

### Driver PIN and chat

Write endpoints compare the `X-Driver-Pin` header with `DRIVER_PIN` using constant-time `hmac.compare_digest`. In current code, an unset variable selects the documented demo default `dhsgu2026`; an explicitly empty value disables the check. This is a demonstration safeguard, not production authentication. The frontend's Axios interceptor reads the PIN from session storage and adds the header when present.

`POST /api/chat` validates a non-empty message up to 2,000 characters, builds the DHSGU transit/safety prompt and URL-encodes it with `urllib.parse.quote`, then calls `https://text.pollinations.ai/...` using Python's built-in `urllib.request.urlopen` with a 12-second timeout. A non-empty text response is returned with `source: pollinations`. Exceptions, timeouts, and blank responses are logged and use `_offline_chat_reply`, returned with `source: offline`. Safety-related keywords route to a reply containing the Campus Security Control Room helpline, 07582-265810. No AI API key is read by the current route.

Handlers return JSON validation errors (commonly 400), missing-record errors (404), and PIN errors (401). Database connections are closed in `finally` blocks; seed operations commit or roll back. The frontend API client has a 70-second Axios timeout to accommodate hosted cold starts; OSRM requests use a 6-second abort timer per request attempt.

## 6. Frontend Build Details

`frontend/src/main.jsx` mounts the React app under `StrictMode` and `BrowserRouter`. `App.jsx` composes shared navigation, footer, and assistant, and declares routes for Home, Routes, route details, Live Map, Places, About, Alerts, and Driver Panel. User type is stored in local storage; the landing route is `/live-map` for students, `/routes` for faculty, and `/driver-panel` for drivers. Page components are in `src/pages`, shared UI in `src/components`, and API clients/map/GPS logic in `src/services`.

### Live Map and routing

The Live Map uses Leaflet/React Leaflet and the OpenStreetMap raster tile URL with attribution. `LiveMapPage.css` applies a desaturation/brightness/contrast filter to mute the tiles. The combined route is rendered twice as a casing (`#0b57d0`, weight 9) and a main line (`#1a73e8`, weight 6). Stop visibility and campus-place visibility are independent UI toggles; route waypoints use circle markers.

BUS-101's simulation is enabled by default. It interpolates along the final combined route coordinates, advances about 300 metres each second, and loops at the route length. Disabling simulation displays the latest backend position. Bus data polling remains every 10 seconds; overlapping refreshes are skipped.

React state stays local to the owning page: Live Map separately tracks bus, place, and stop data, loading/errors, layer toggles, itinerary visibility, and simulation position. Places and route stops load once per page mount; bus locations refresh on their own timer. The Driver Panel separately owns its editable bus form and current recorder trace state.

`roadRoutingService.js` calls the public OSRM driving endpoint for each pair of consecutive stops. It validates the GeoJSON coordinate list and returned distance. The strict detour limit is `max(2.2 * directDistance, directDistance + 3 km)`. If rejected or unavailable, it retries that segment with `max(3.5 * directDistance, directDistance + 5 km)`. If both candidates fail, that segment uses its direct two-point geometry. Segment geometries are combined and duplicate adjacent coordinates removed. The map therefore can show road geometry for some legs and straight fallback geometry for others without per-segment colors.

### GPS route recorder

The Driver Panel recorder uses `navigator.geolocation.watchPosition` with high accuracy, `maximumAge: 1000 ms`, and `timeout: 15000 ms`. It retains fixes with accuracy at most 30 metres and at least 10 metres from the last retained point, up to 2,000 points. It displays the growing path in a small Leaflet map, current point, retained-point count, and distance. Stopping returns `[latitude, longitude]` pairs rounded to six decimal places. Copy and `route-trace.json` download are browser-only exports; there is no backend persistence or route replacement endpoint in the current code.

## 7. External Services

| Service | Current use | Fallback / limits |
| --- | --- | --- |
| OpenStreetMap tiles | Leaflet loads `https://tile.openstreetmap.org/{z}/{x}/{y}.png`; attribution is included and CSS visually mutes the tiles. Open map data and no API key are used. | No alternate tile provider is configured in code. A network/service outage can leave the basemap unavailable. |
| OSRM public routing | Browser requests road geometry from `https://router.project-osrm.org/route/v1/driving`; public endpoint requires no key. | Strict then relaxed per-leg detour guards, then straight-line geometry. Public endpoint availability and usage limits are outside the app's control. |
| Pollinations.ai | Flask calls `https://text.pollinations.ai/<encoded-prompt>` as a free, keyless text service over HTTPS. | 12-second timeout, exception/empty-output handling, and a deterministic offline keyword responder. No availability guarantee is encoded by the app. |

## 8. Testing & Quality

Post-report verification on 2026-10-05 passed **18 backend unittest cases** and **68 frontend tests across 25 Vitest files**. The backend suite covers API contracts and validation, driver PIN behavior, seed integrity/reset, and Pollinations/offline fallback. The frontend suite covers pages and routing, service requests, map rendering and OSRM strict/relaxed/straight-fallback behavior, 10-second polling and bus simulation, GPS accuracy/distance/cap/export, and chat UI states.

`frontend/package.json` defines `npm test` (Vitest), `npm run lint` (Oxlint), and `npm run build` (Vite production build). The post-report build succeeded; Vite reported a minified JavaScript chunk above 500 kB. Oxlint completed with one `react(set-state-in-effect)` warning in `src/pages/LiveMapPage.jsx`. No CI workflow file is present in the repository, so no CI lint/test gate is claimed here.

## 9. Deployment & CI/CD

The root README documents Vercel with root directory `campus-bus-tracking/frontend`, build command `npm run build`, and output directory `dist`. `frontend/vercel.json` rewrites all paths to `/index.html`, which supports React Router deep links such as `/live-map` and `/driver-panel`. `VITE_API_BASE_URL` points the SPA at the deployed Flask API.

The README documents Render with root directory `campus-bus-tracking/backend`, build command `pip install -r requirements.txt`, and start command `gunicorn app:app --bind 0.0.0.0:$PORT`. The app calls startup seeding when imported. The free-tier filesystem is ephemeral, so runtime SQLite updates are not durable. There is no Render manifest or repository CI/CD workflow; automatic deployment on push depends on the hosting providers' dashboard Git integrations and cannot be verified from this repository alone.

## 10. Security Considerations

- User-provided values in database reads/writes are passed through SQLite placeholders. The migration's interpolated table names are internal fixed values, not request data.
- Flask-CORS permits localhost development and the two Vercel origins listed in `app.py`; `FRONTEND_ORIGIN` can append another origin.
- `DRIVER_PIN` is transmitted in `X-Driver-Pin` and provides only a demo safeguard. The default demo value is public, blank configuration disables the check, and there is no user identity or role authorization on the API. Do not treat this as production authentication. The API documentation's statement about an unset PIN differs from current source behavior; `routes.py` is authoritative.
- No production secret should be committed. The current Pollinations path requires no key. `backend/.env.example` and the root README still contain legacy Gemini references; the current chat route does not read `GEMINI_API_KEY`. These references are documentation/config-template residue, not active chatbot configuration.
- Production URLs and external service calls documented/used by the app use HTTPS. Local development defaults to HTTP on loopback. TLS termination and hosting security settings are provider responsibilities.
- Demo bus, route, schedule, and place data are marked unverified; the UI warns that they are not official DHSGU operational data.

## 11. Engineering Challenges & Solutions

- **Vercel domain/CORS mismatch:** repository history records production-origin corrections. The current Flask allow-list includes both deployed Vercel domains, localhost development origins, and an optional `FRONTEND_ORIGIN`.
- **SPA deep-link 404s:** `frontend/vercel.json` sends unknown paths to the SPA entry point so React Router can render nested routes after direct navigation or refresh.
- **Ephemeral SQLite on Render:** app startup runs idempotent demo seeding and preserves verified records so demo content reappears after an ephemeral disk reset.
- **OSRM detours and loops:** route history records a shift to per-segment routing. Strict and relaxed distance guards reject implausible long legs before a direct-geometry fallback is used.
- **Watermarked basemap experiments:** history shows the basemap moved from Esri tiles to OpenStreetMap; current source uses the OSM tile endpoint, required attribution, and a CSS muting filter. No tile-provider failover is implemented.
- **Keyless AI activation:** the previous Gemini integration was replaced with a built-in `urllib` Pollinations request, fixed timeout, and local offline fallback. The requirements and README retain legacy Gemini references that are no longer active in `routes.py`.
- **Route trace collection:** a browser-only watchPosition recorder applies accuracy/distance filters, caps retained points, and exports coordinates without introducing backend persistence.

## 12. How to Run Locally

Use separate terminals from the repository's parent directory. The commands below follow the root README and PowerShell conventions.

Backend:

```powershell
cd campus-bus-tracking\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

The local API listens at `http://127.0.0.1:5000` by default. In another terminal:

```powershell
cd campus-bus-tracking\frontend
npm install
npm run dev
```

Open the Vite URL printed by the command, usually `http://localhost:5173`. Test commands, run from each package directory:

```powershell
# From campus-bus-tracking\backend
python -m unittest discover -s tests -v

# From campus-bus-tracking\frontend
npm test
npm run lint
npm run build
```

The source files read `PORT`, `FLASK_DEBUG`, `FRONTEND_ORIGIN`, and `DRIVER_PIN` on the backend and `VITE_API_BASE_URL` on the frontend. Defaults are intended for local development; production values belong in provider settings, not committed files.

## 13. Future Scope

- Replace the single seeded demo bus with an authenticated, multi-bus fleet and operator workflows.
- Calculate ETAs from verified schedules, live positions, and historical travel data; evaluate machine-learning estimates only after suitable data is available.
- Integrate official DHSGU route, stop, timetable, place, and emergency-contact data with university approval and verification metadata.
- Add a native mobile client with background location, battery-aware recording, and driver identity controls.
