# Campus Bus Tracking App

A mobile-responsive campus transit app for students and drivers. Students can review shuttle routes and stops, follow bus locations on a map, and see service alerts. A demonstration driver panel updates bus positions and status and broadcasts alerts.

## Problem and Objectives

For the CodeCraft Mobile App Development Challenge, this project addresses the difficulty of knowing where campus buses are, when they will reach stops, and whether service has changed. Its objectives are to make route and schedule information easy to find, provide live or demonstration GPS updates, and communicate delays and route changes promptly.

The sample coordinates are demonstration data around a representative university campus area, not official DHSGU vehicle tracking. The driver panel can use browser GPS where available or manual coordinates.

## Features

- Browse bus routes, service hours, and stop arrival/departure times.
- View bus markers on an OpenStreetMap-based Leaflet map; locations refresh every 10 seconds.
- See bus status badges and active delay/route-change alerts.
- Update bus coordinates and status from the demonstration driver panel.
- Create and activate/deactivate service alerts.
- Use the REST API backed by a local SQLite database.

## Technology Stack

- Frontend: React, Vite, React Router, Axios, Bootstrap
- Mapping: Leaflet, React-Leaflet, OpenStreetMap tiles
- Backend: Python, Flask, Flask-CORS
- Database: SQLite
- Deployment targets: Vercel (frontend), Render or Railway (backend)

## Project Structure

```text
campus-bus-tracking/
  backend/
    app.py                 Flask app and health endpoint
    routes.py              REST API endpoints
    database.py            SQLite schema and connection helper
    seed.py                Demonstration data
    requirements.txt       Python dependencies
    campus_bus.db          Created locally at runtime; not committed
  docs/
    api-documentation.md   Endpoint reference
    demo-script.md         Hackathon presentation outline
  frontend/
    src/components/        Shared UI components
    src/pages/             Dashboard, routes, map, alerts, driver panel
    src/services/          API and browser geolocation services
    .env.example           Local API URL example
```

## Prerequisites

- Node.js 20.19+ or 22.12+ and npm (required by the current Vite version)
- Python 3.10+
- A modern browser; browser location requires permission and a secure context (localhost is allowed)

## Installation and Local Run

Run the backend first. In PowerShell from the project root:

```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python seed.py
python app.py
```

The API runs at `http://127.0.0.1:5000`. Keep this terminal open. In a second PowerShell terminal, from the project root:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`. The frontend defaults to `http://127.0.0.1:5000` if `VITE_API_BASE_URL` is not set. The SQLite database and tables are created automatically when the backend starts; `python seed.py` inserts sample data once and safely skips subsequent runs.

If PowerShell blocks virtual-environment activation, use `venv\Scripts\python.exe -m pip install -r requirements.txt`, `venv\Scripts\python.exe seed.py`, and `venv\Scripts\python.exe app.py` instead.

## API Documentation Summary

The API base URL locally is `http://127.0.0.1:5000`. The full request and response examples are in [docs/api-documentation.md](docs/api-documentation.md).

- `GET /api/health`
- `GET /api/routes` and `GET /api/routes/<route_id>`
- `GET /api/buses` and `GET /api/buses/<bus_id>`
- `POST /api/buses/<bus_id>/location`
- `POST /api/buses/<bus_id>/status`
- `GET /api/alerts`, `POST /api/alerts`, and `PATCH /api/alerts/<alert_id>`

## Demonstration

See [docs/demo-script.md](docs/demo-script.md) for a timed 5–10-minute presentation plan. For a quick run-through, open Home, browse a route and its stops, inspect the Live Map, then use Driver Panel to change a bus location/status and broadcast an alert.

## Screenshots

Add screenshots of the Home dashboard, route details, Live Map, and Driver Panel here after capturing them for the submission.

## Future Improvements

- Push notifications for new or changed alerts.
- A React Native mobile client.
- Secure driver authentication and role-based administration.
- Production-grade persistent storage and real vehicle GPS hardware integration.

## Team

Add individual/team member name(s) and submission details here.

## Deployment

### Backend on Render or Railway

Create a Python web service with `backend` as its root directory. Use `pip install -r requirements.txt` as the build command. Gunicorn is included in `requirements.txt` for non-Windows platforms. Use this start command so the service binds to the hosting platform's assigned port:

```text
gunicorn app:app --bind 0.0.0.0:$PORT
```

The equivalent basic Gunicorn command is `gunicorn app:app`; use the explicit `$PORT` binding when required by the host. Set `FRONTEND_ORIGIN` to the deployed Vercel origin so Flask-CORS accepts browser requests. The database is initialized when the app starts. Run `python seed.py` manually from the provider's shell for demonstration data; it is idempotent. SQLite files on many hosted services are ephemeral unless a persistent disk is configured, so attach durable storage or choose a managed database if data must survive redeployments.

### Frontend on Vercel

Import the repository into Vercel and set the project root directory to `frontend`. Use `npm run build` as the build command and `dist` as the output directory. Add the environment variable `VITE_API_BASE_URL` with the deployed backend origin, for example `https://your-campus-bus-api.example.com` (no `/api` suffix). Vite embeds this value at build time, so redeploy after changing it. The checked-in `frontend/.env.example` is for local development only; configure the production value in Vercel's project settings.