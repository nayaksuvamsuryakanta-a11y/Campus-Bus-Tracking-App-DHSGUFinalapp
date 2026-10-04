# DHSGU Campus Bus Tracker

A campus-focused transit and wayfinding web app for Dr. Harisingh Gour University (DHSGU). The React client brings together a live bus map, a seven-stop campus itinerary, driver-posted location and status updates, service alerts, and a Gemini-powered campus assistant with an offline fallback. It is a hackathon demonstration, not an official DHSGU transit service.

## Live URLs

- Frontend: [https://campus-bus-tracking-app-dhsgu-final.vercel.app](https://campus-bus-tracking-app-dhsgu-final.vercel.app)
- Backend health: [https://dhsgu-bus-api.onrender.com/api/health](https://dhsgu-bus-api.onrender.com/api/health)
- API base: [https://dhsgu-bus-api.onrender.com](https://dhsgu-bus-api.onrender.com)

The Render free tier may take up to 60 seconds to wake after inactivity. Allow for this cold start before the demo.

## Features

- Google-style live map with campus bus markers, a blue-cased route, OSRM road routing, and a per-segment straight-line fallback when road geometry is unavailable or an unreasonable detour.
- Seven-stop Campus Circle demo itinerary: Vivekanand Boys Hostel; Rani Laxmi Bai Girls Hostel; Institute of Engineering & Technology; Department of Computer Science and Applications; Department of Criminology and Forensic; Nivedita Girls Hostel; Jawaharlal Nehru Central Library.
- Driver panel for posting a bus location and status. Demo PIN: `dhsgu2026`. This PIN is a demonstration safeguard, not production authentication.
- Gemini-powered campus assistant with a transparent offline reply when the API key is missing or the service is unavailable.
- Bus location refresh every 10 seconds.
- Service alerts and campus place browsing.

## Technology Stack

| Layer | Technology | Hosting / role |
| --- | --- | --- |
| Frontend | React, Vite, Leaflet | Vercel SPA |
| Backend | Flask, SQLite, Gunicorn | Render API |
| External services | OSRM, Google Gemini | Road routing and optional AI replies |

## Architecture

```text
Browser --> Vercel SPA --> Render Flask API --> SQLite
               |                  |                (demo data seeded at startup)
               +--> OSRM          +--> Google Gemini (optional)
```

The browser uses the Render API for app data and driver updates. OSRM provides road geometry to the map; Gemini is called by the backend when configured. The backend initializes and seeds the SQLite database at startup.

## Local Quickstart

Requires Python 3.10+ and Node.js 20.19+ or 22.12+.

Start the backend from the repository root:

```powershell
cd campus-bus-tracking\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

The API starts at `http://127.0.0.1:5000`; the app initializes and seeds its local SQLite database on startup. Keep this terminal running.

In a second terminal, start the frontend:

```powershell
cd campus-bus-tracking\frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

## Tests

Run the backend and frontend suites from the repository root:

```powershell
cd campus-bus-tracking\backend
python -m unittest discover -s tests -v
cd ..\frontend
npm test
```

## Deployment

**Render backend**

- Root directory: `campus-bus-tracking/backend`
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app --bind 0.0.0.0:$PORT`
- The Flask app initializes and seeds the database at startup. SQLite on an ephemeral free-tier filesystem is not durable across service restarts or redeploys.

**Vercel frontend**

- Root directory: `campus-bus-tracking/frontend`
- Build command: `npm run build`
- Output directory: `dist`
- `frontend/vercel.json` rewrites SPA paths to `/index.html`, enabling direct routes such as `/live-map` and `/driver-panel`.
- Set `VITE_API_BASE_URL` to `https://dhsgu-bus-api.onrender.com` in Vercel project settings.

## Demonstration Data Notice

All routes, stops, timings, and driver/bus records are demonstration data, not official DHSGU schedules or vehicle tracking. Place coordinates are also unverified demo coordinates. Confirm route, schedule, location, and driver details with the university before any operational use.

## Pitch Deck

[CodeCraft Challenge: DHSGU Campus Bus Tracker](docs/CodeCraft_Challenge_DHSGU_Campus_Bus_Tracker.pptx)
