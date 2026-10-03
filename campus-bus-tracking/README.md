# Campus Bus Tracking App

A mobile-responsive campus guide and bus-tracking demonstration for Dr. Harisingh Gour Vishwavidyalaya (DHSGU), also called Sagar University. Students can review routes and stops, browse named campus places, view bus markers, and see service alerts. A demonstration driver panel updates placeholder bus positions/status and broadcasts alerts.

## Problem and Objectives

For the CodeCraft Mobile App Development Challenge, this project addresses the difficulty of knowing where campus buses are, when they will reach stops, and whether service has changed. Its objectives are to make route and schedule information easy to find, provide live or demonstration GPS updates, and communicate delays and route changes promptly.

Only the university facts and place names listed in this README are sourced from verified DHSGU information. Bus routes, stop names/times, driver labels, and bus locations are demonstration data marked with `Demo data - not official`; they are not official DHSGU routes or vehicle tracking. The five seeded campus landmarks use the provided campus coordinates, and the map center frames those locations. The driver panel can use browser GPS where available or manual coordinates.

## Features

- Browse bus routes, service hours, and stop arrival/departure times.
- Browse DHSGU place names and facility categories; unverified coordinates are labeled.
- View bus markers on an OpenStreetMap-based Leaflet map; bus locations refresh every 10 seconds.
- See bus status badges and active delay/route-change alerts.
- Update bus coordinates and status from the demonstration driver panel.
- Create and activate/deactivate service alerts.
- Ask the DHSGU Transit & Safety Assistant about verified university facts and current active alerts; without a Gemini key it uses offline demo replies.
- Select Student, Faculty, or Driver to choose the default landing page; this is not authentication.
- Optionally require a demo Driver PIN for write requests.
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
    requirements.txt       Python dependencies, including Gemini SDK
    .env.example           Backend-only environment variable template
    campus_bus.db          Created locally at runtime; not committed
    tests/                 Flask test-client tests using temporary SQLite databases
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

The API runs at `http://127.0.0.1:5000`. The database schema and demo data are initialized automatically when the backend starts. Keep this terminal open. In a second PowerShell terminal, from the project root:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`. `VITE_API_BASE_URL` is the API origin only, with no `/api` suffix; the local fallback is `http://127.0.0.1:5000`. `python seed.py` can also be run manually and is idempotent; `python seed.py --reset` clears and recreates rows marked unverified/demo while preserving verified rows and university facts.

If PowerShell blocks virtual-environment activation, use `venv\Scripts\python.exe -m pip install -r requirements.txt`, `venv\Scripts\python.exe seed.py`, and `venv\Scripts\python.exe app.py` instead.

The Driver Panel prompts for a PIN. If `DRIVER_PIN` is set, enter that value; if it is unset, the backend uses the built-in demo PIN `dhsgu2026`. An explicitly empty `DRIVER_PIN` disables the optional check. The PIN is kept in `sessionStorage` for that browser tab and sent as `X-Driver-Pin`. This is a demonstration safeguard only, not real authentication.

### Gemini Assistant (Optional)

The assistant uses the backend-only `GEMINI_API_KEY` variable; never add the key to a `VITE_` variable or commit it. Create a free key in [Google AI Studio](https://aistudio.google.com/app/apikey), copy `backend/.env.example` to a private notes file if useful, then set it in the PowerShell session running Flask:

```powershell
$env:GEMINI_API_KEY = "your-key-from-google-ai-studio"
python app.py
```

Install the requested Gemini SDK into the backend virtual environment with:

```powershell
cd backend
venv\Scripts\Activate.ps1
python -m pip install google-generativeai
```

Alternatively rerun `python -m pip install -r requirements.txt`. When the key is absent or Gemini is unavailable, `/api/chat` returns an offline response directing users to the Routes, Places, Live Map, or Alerts pages. The assistant uses university information, verified place rows, active alerts, and route summaries as RAG-lite context; unverified demo entries are explicitly identified in its instructions.

Test the endpoint locally without an API key (the response should mention offline demo mode):

```powershell
curl.exe -X POST http://127.0.0.1:5000/api/chat `
  -H "Content-Type: application/json" `
  --data-raw '{"message":"Are there any bus delays today?"}'
```

To run backend tests from `backend`, use `python -m unittest discover -s tests -v`. To verify the frontend, run `npm run build` and `npm run lint` from `frontend`.

## API Documentation Summary

The API base URL locally is `http://127.0.0.1:5000`. The full request and response examples are in [docs/api-documentation.md](docs/api-documentation.md).

- `GET /api/health`
- `GET /api/university`
- `GET /api/places`, `GET /api/places?category=HOSTEL`, and `GET /api/places/<place_id>`
- `GET /api/routes` and `GET /api/routes/<route_id>`
- `GET /api/buses` and `GET /api/buses/<bus_id>`
- `POST /api/buses/<bus_id>/location`
- `POST /api/buses/<bus_id>/status`
- `GET /api/alerts`, `POST /api/alerts`, and `PATCH /api/alerts/<alert_id>`
- `POST /api/chat` with `{"message":"..."}` for the Gemini/offline assistant

## Demonstration

See [docs/demo-script.md](docs/demo-script.md) for a timed 5–10-minute presentation plan. For a quick run-through, open Places/About DHSGU, browse a demo route and its stops, inspect the Live Map, then use Driver Panel to change a bus location/status and broadcast a demo alert.

## Screenshots

Add screenshots of the Home dashboard, route details, Live Map, and Driver Panel here after capturing them for the submission.

## Future Improvements

- Push notifications for new or changed alerts.
- A React Native mobile client.
- Secure driver authentication and role-based administration.
- Production-grade persistent storage and real vehicle GPS hardware integration.

## Team

Add individual/team member name(s) and submission details here.

## Data You Must Confirm

- Official routes, stop names, schedules, and driver/bus assignments with DHSGU transport staff.
- Current contact details. No phone numbers or email addresses are fabricated; confirm with the Security Department or Registrar's office.
- A deployment-only `DRIVER_PIN`, if the demo safeguard is enabled. Do not commit secrets.

## Deployment

### Backend on Render or Railway

Create a Python web service with `backend` as its root directory. Use `pip install -r requirements.txt` as the build command. Gunicorn is included in `requirements.txt` for non-Windows platforms. Use this start command so the service binds to the hosting platform's assigned port:

```text
gunicorn app:app --bind 0.0.0.0:$PORT
```

The equivalent basic Gunicorn command is `gunicorn app:app`; use the explicit `$PORT` binding when required by the host. Set `FRONTEND_ORIGIN` to the deployed Vercel origin so Flask-CORS accepts browser requests. Set `GEMINI_API_KEY` in the backend service's environment settings to enable AI replies; do not place it in frontend settings. Set a private `DRIVER_PIN` in the provider's environment settings; the built-in PIN is public demo-only protection. The app initializes the schema and reseeds demo data at startup. SQLite files on many hosted services are ephemeral, so runtime updates are lost across restarts; use durable storage or a managed database if data must persist.

### Frontend on Vercel

Import the repository into Vercel and set the project root directory to `frontend`. Use `npm run build` as the build command and `dist` as the output directory. Add the environment variable `VITE_API_BASE_URL` with the deployed backend origin, for example `https://your-campus-bus-api.example.com` (no `/api` suffix). Vite embeds this value at build time, so redeploy after changing it. Set the backend's `FRONTEND_ORIGIN` to the deployed Vercel origin. The checked-in `frontend/.env.example` is for local development only; configure the production value in Vercel's project settings.