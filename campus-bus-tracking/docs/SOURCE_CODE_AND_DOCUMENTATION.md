# DHSGU Campus Bus Tracker

## Source Code and Documentation Submission

### Part 0 - Cover and Metadata

| Field | Value |
| --- | --- |
| Project | DHSGU Campus Bus Tracker |
| Author | Suvam, BCA Undergraduate |
| Event | CodeCraft Challenge |
| Repository | https://github.com/nayaksuvamsuryakanta-a11y/Campus-Bus-Tracking-App-DHSGUFinalapp |
| Live frontend | https://campus-bus-tracking-app-dhsgu-final.vercel.app |
| Live backend | https://dhsgu-bus-api.onrender.com |
| Document date | 2026-10-05 |

### Table of Contents

- [Part 1 - Documentation](#part-1---documentation)
  - [1. Executive Summary and Problem](#1-executive-summary-and-problem)
  - [2. Languages, Frameworks, and Libraries](#2-languages-frameworks-and-libraries)
  - [3. System Architecture](#3-system-architecture)
  - [4. Database Schema](#4-database-schema)
  - [5. REST API Reference](#5-rest-api-reference)
  - [6. Feature Documentation](#6-feature-documentation)
  - [7. Testing Strategy](#7-testing-strategy)
  - [8. Deployment](#8-deployment)
  - [9. Security and Limitations](#9-security-and-limitations)
  - [10. Local Setup and Tests](#10-local-setup-and-tests)
- [Part 2 - Source Code Listings](#part-2---source-code-listings)
- [Part 3 - Appendices](#part-3---appendices)
  - [Appendix A - Test Suite Summary](#appendix-a---test-suite-summary)
  - [Appendix B - Engineering Case Studies](#appendix-b---engineering-case-studies)
  - [Appendix C - Companion Documents](#appendix-c---companion-documents)

## Part 1 - Documentation

### 1. Executive Summary and Problem

DHSGU Campus Bus Tracker is a browser-based campus transit and wayfinding demonstration for students, faculty, and drivers at Dr. Harisingh Gour Vishwavidyalaya. It brings campus route and stop information, bus status/location, campus places, alerts, and a driver update interface into one application. The problem it addresses is the fragmentation of those basic campus mobility tasks across separate sources and the need for a clear visual route and location view.

Headline features are the Leaflet live map and itinerary panel, public OSRM road routing with guarded direct-line fallbacks, a looping animated BUS-101 demonstration marker, a Pollinations.ai assistant with offline fallback and safety helpline guidance, a browser GPS route recorder with export, and a PIN-gated driver panel. Seeded route, stop, place, and bus data are explicitly demo data; the application is not an official DHSGU dispatch system.

### 2. Languages, Frameworks, and Libraries

The table records the declared constraints exactly as written in `backend/requirements.txt` and `frontend/package.json`. Python entries are version ranges and npm entries use caret ranges; they do not claim a specific resolved runtime version.

| Package | Declared version | Role |
| --- | --- | --- |
| Python / Flask | Flask `>=3.0,<4.0` | REST application and request handling. |
| Flask-Cors | `>=4.0,<6.0` | API CORS policy. |
| Gunicorn | `>=23.0,<24.0` (non-Windows) | WSGI server documented for Render. |
| google-generativeai | `>=0.8,<1.0` | Legacy requirement still declared; current chat route uses Pollinations and does not import it. |
| React / React DOM | `^19.2.8` | SPA component rendering. |
| Vite | `^8.3.0` | Development server and production build. |
| `@vitejs/plugin-react` | `^6.1.1` | Vite's React plugin. |
| React Router DOM | `^7.18.4` | Client-side navigation. |
| Leaflet / React Leaflet | `^1.9.4` / `^5.0.0` | Interactive map and React bindings. |
| Axios | `^1.20.0` | Frontend HTTP client. |
| Bootstrap | `^5.3.8` | UI layout and components. |
| Vitest | `^5.0.3` | Frontend test runner. |
| Testing Library React / user-event / jest-dom | `^16.3.3` / `^14.6.7` / `^7.0.1` | DOM/component behavior tests and assertions. |
| jsdom | `^30.1.1` | Browser-like test environment. |
| Oxlint | `^1.81.0` | Frontend lint command. |

Application languages are Python (Flask, schema/queries, seed, backend tests), JavaScript/JSX (React, services, configuration, frontend tests), HTML (`frontend/index.html`), CSS (Live Map and Driver Panel styles plus Bootstrap), and SQL embedded in Python schema and query strings.

### 3. System Architecture

```text
+-------------------------------- Browser --------------------------------+
| React SPA / React Router                                                |
| Pages, components, Leaflet, UI state, browser GPS recorder               |
+----------------+----------------------+---------------------------------+
                 | REST requests        | tile and routing requests
                 v                      +------------------+----------------+
+-------------------------------+                         |                |
| Flask API (Render)            |                         v                v
| validation, PIN, chat fallback|                  OSM tile service   OSRM API
+---------------+---------------+                  (HTTPS)            (HTTPS)
                |
                +---------------------------> Pollinations.ai (HTTPS)
                |
                v
        +---------------+
        | SQLite        |
        | demo records  |
        +---------------+
```

The SPA owns display state, browser geolocation, map tiles, and OSRM requests. Flask validates requests, applies the write-endpoint PIN check, runs the chatbot call/fallback, and reads or updates SQLite. The GPS route trace remains in browser memory and can be copied/downloaded; there is no trace persistence endpoint.

### 4. Database Schema

The actual schema is created by `backend/database.py`. All tables use SQLite; `PRAGMA foreign_keys = ON` is applied to each connection. `campus_places` is the physical table name for campus places.

| Table | Columns (schema order) | Relationships |
| --- | --- | --- |
| `routes` | `id INTEGER PRIMARY KEY AUTOINCREMENT`, `route_name TEXT NOT NULL`, `description TEXT`, `start_time TEXT NOT NULL`, `end_time TEXT NOT NULL`, `is_verified INTEGER DEFAULT 0` | Parent of `stops` and optional parent of `buses`. |
| `stops` | `id INTEGER PRIMARY KEY AUTOINCREMENT`, `route_id INTEGER NOT NULL`, `stop_name TEXT NOT NULL`, `arrival_time TEXT`, `departure_time TEXT`, `latitude REAL`, `longitude REAL`, `is_verified INTEGER DEFAULT 0` | `route_id` references `routes.id`; one route has many stops. |
| `buses` | `id INTEGER PRIMARY KEY AUTOINCREMENT`, `bus_number TEXT NOT NULL`, `route_id INTEGER`, `driver_name TEXT`, `status TEXT DEFAULT 'OFFLINE'`, `latitude REAL`, `longitude REAL`, `updated_at TEXT`, `is_verified INTEGER DEFAULT 0` | Nullable `route_id` references `routes.id`; a route may be assigned to multiple buses. |
| `alerts` | `id INTEGER PRIMARY KEY AUTOINCREMENT`, `title TEXT NOT NULL`, `message TEXT NOT NULL`, `alert_type TEXT DEFAULT 'GENERAL'`, `is_active INTEGER DEFAULT 1`, `is_demo INTEGER DEFAULT 0`, `created_at TEXT DEFAULT CURRENT_TIMESTAMP` | Independent record set. |
| `campus_places` | `id INTEGER PRIMARY KEY AUTOINCREMENT`, `name TEXT NOT NULL`, `category TEXT NOT NULL`, `description TEXT`, `latitude REAL`, `longitude REAL`, `is_verified INTEGER DEFAULT 0`, `notes TEXT` | Independent place directory. |
| `university_info` | `key TEXT PRIMARY KEY`, `value TEXT NOT NULL` | Independent key/value facts. |

The database path is `backend/campus_bus.db`, adjacent to `database.py`. `app.py` invokes `seed_database()` on startup. The seed process recreates unverified demo records, preserves verified records, inserts university facts without overwriting existing keys, and commits or rolls back the operation. This supports Render's ephemeral disk demo behavior; runtime writes are not durable across restarts there.

### 5. REST API Reference

Routes below are derived from the decorators in `backend/app.py` and `backend/routes.py`. `X-Driver-Pin` is required on write endpoints protected by `_driver_pin_error`; read endpoints and chat do not use it.

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/api/health` | Report API health/service name. | None |
| POST | `/api/chat` | Get Pollinations answer or offline knowledge-base response. | None |
| GET | `/api/university` | Return university information as a key/value object. | None |
| GET | `/api/places` | List places; optional `category` filter. | None |
| GET | `/api/places/<int:place_id>` | Return one place. | None |
| GET | `/api/routes` | List routes. | None |
| GET | `/api/routes/<int:route_id>` | Return route details and ordered stops. | None |
| GET | `/api/buses` | List buses, route names, status, and coordinates. | None |
| GET | `/api/buses/<int:bus_id>` | Return one bus. | None |
| POST | `/api/buses/<int:bus_id>/location` | Validate and update bus coordinates/time. | `X-Driver-Pin` |
| POST | `/api/buses/<int:bus_id>/status` | Set one of the allowed bus statuses. | `X-Driver-Pin` |
| GET | `/api/alerts` | List alerts, newest first. | None |
| POST | `/api/alerts` | Create a validated alert. | `X-Driver-Pin` |
| PATCH | `/api/alerts/<int:alert_id>` | Update an alert's active state. | `X-Driver-Pin` |

### 6. Feature Documentation

- **Live map and itinerary:** Leaflet displays OpenStreetMap tiles with attribution and a muted CSS filter. The demo route is drawn as a uniform blue casing (`#0b57d0`, weight 9) and main stroke (`#1a73e8`, weight 6); optional stops, places, route details, and map errors have separate UI state. Bus data loads immediately and refreshes every 10 seconds, skipping overlapping refresh calls.
- **OSRM routing:** each consecutive stop pair is requested from the public OSRM driving endpoint. Candidate geometry is validated; strict maximum distance is `max(2.2 x direct distance, direct distance + 3 km)`, followed by a relaxed `max(3.5 x direct distance, direct distance + 5 km)`. A rejected or failed pair uses the direct two-point geometry. Request attempts use a 6-second abort timer. The combined geometry removes duplicate adjacent vertices.
- **Animated demo bus:** the BUS-101 simulation defaults on, advances 300 metres per one-second timer tick along the combined route coordinates, interpolates within segments, and loops at route length. Toggling it off reveals the backend-polled position; polling continues independently.
- **GPS route recorder:** Driver Panel uses `navigator.geolocation.watchPosition` with high accuracy, `maximumAge: 1000`, and `timeout: 15000`. It keeps points with accuracy <= 30 m and at least 10 m from the last kept point, capped at 2,000. A live Leaflet map shows a green trace/current point, while status reports kept points/distance. Stop returns `[latitude, longitude]` pairs rounded to six decimals; copy and JSON download are browser-only.
- **Driver panel and PIN:** the driver view updates bus location/status and creates alerts. Its PIN is stored in session storage and attached by the Axios interceptor. Backend `DRIVER_PIN` unset selects the public demo fallback `dhsgu2026`; an explicit empty value disables checking. This is demo gating, not user authentication.
- **AI assistant and safety ladder:** Flask constructs a transit/safety prompt containing the seven seeded route-stop names and calls the keyless Pollinations text endpoint with a 12-second timeout. A valid non-empty response returns source `pollinations`; errors/timeouts/empty text use `_offline_chat_reply` with source `offline`. The offline responder uses keyword branches and prioritizes safety-related terms. The online prompt and offline safety branch include Campus Security Control Room (24x7 helpline) 07582-265810. No `gemini` source is emitted by the current implementation.

### 7. Testing Strategy

The latest recorded application test runs before this document were **18 backend unittest cases** and **68 frontend Vitest tests across 25 files**. The backend suite covers request validation and API contracts, PIN behavior, database seeding/reset, and mocked Pollinations success/timeout/offline behavior. Frontend coverage exercises routing/page states, API services, Live Map rendering and detour guards, simulation/polling, recorder accuracy/distance/cap/export, and chat interactions.

Frontend quality scripts are declared in `package.json`: `npm test`, `npm run lint` (Oxlint), and `npm run build` (Vite). Latest recorded lint completed with one `react(set-state-in-effect)` warning in `LiveMapPage.jsx`; the latest build passed with a Vite chunk-size warning above 500 kB. The repository does not contain a CI workflow.

### 8. Deployment

Deployment values below are documented in `README.md`; automatic deploy behavior is managed outside this repository in the hosting dashboards. No Render manifest or CI/CD workflow is tracked.

- **Vercel:** root directory `campus-bus-tracking/frontend`; build `npm run build`; output `dist`; `frontend/vercel.json` rewrites paths to `/index.html` for React Router deep links. Configure `VITE_API_BASE_URL` to the Render API URL in project settings.
- **Render:** root directory `campus-bus-tracking/backend`; build `pip install -r requirements.txt`; start `gunicorn app:app --bind 0.0.0.0:$PORT`. Importing `app.py` seeds the database. Free-tier SQLite storage is ephemeral.

### 9. Security and Limitations

SQL request values are bound through SQLite placeholders. CORS is limited to localhost development and the two Vercel origins in `app.py`, with optional `FRONTEND_ORIGIN`. The PIN is a shared demo value in a request header, not identity-based authorization; the source defaults to `dhsgu2026` when `DRIVER_PIN` is unset and disables the check when it is empty. Do not treat it as production authentication.

Seeded routes, locations, stops, timings, bus status, and driver records are demo data, not official transit data; unverified places also carry demo notes. Live hosted URLs and external service endpoints use HTTPS; local development defaults to HTTP on loopback. No production API key is required by Pollinations. The repository still has legacy Gemini references in the root README, `backend/.env.example`, and `requirements.txt`; the current `routes.py` uses Pollinations and does not read the Gemini key. The API documentation's statement about unset PIN behavior also differs from current source; source is authoritative.

### 10. Local Setup and Test Commands

Run these commands in separate PowerShell terminals from the repository's parent directory.

Backend:

```powershell
cd campus-bus-tracking\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

Frontend:

```powershell
cd campus-bus-tracking\frontend
npm install
npm run dev
```

The backend defaults to `http://127.0.0.1:5000`; Vite prints its local URL, typically `http://localhost:5173`. Tests:

```powershell
# In campus-bus-tracking\backend
python -m unittest discover -s tests -v

# In campus-bus-tracking\frontend
npm test
npm run lint
npm run build
```

Backend runtime settings in source are `PORT`, `FLASK_DEBUG`, `FRONTEND_ORIGIN`, and `DRIVER_PIN`; frontend API base is `VITE_API_BASE_URL`.

## Part 2 - Source Code Listings

The following listings are copied from the repository source files. Each block is complete as of the repository state used to prepare this submission.

### `backend/app.py`

Purpose: Creates the Flask application, seeds data at startup, configures CORS, registers API routes, and provides the health endpoint.

```python
import os

from flask import Flask, jsonify
from flask_cors import CORS

from routes import api
from seed import seed_database


app = Flask(__name__)
seed_database()

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://campus-bus-tracking-app-dhsgu-final.vercel.app",
    "https://campus-bus-tracking-app-dhsgu-finalapp.vercel.app",
]
frontend_origin = os.getenv("FRONTEND_ORIGIN")
if frontend_origin:
    allowed_origins.append(frontend_origin)

CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
app.register_blueprint(api, url_prefix="/api")


@app.get("/api/health")
def health():
    return jsonify({"status": "running", "service": "Campus Bus Tracking API"})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG") == "1")
```

### `backend/seed.py`

Purpose: Defines DHSGU demo records and transactionally creates/refreshes unverified university, place, route, stop, bus, and alert data.

```python
import argparse
from datetime import datetime, timezone

from database import get_db_connection, init_db


UNIVERSITY_INFO = {
    "name_english": "Dr. Harisingh Gour Vishwavidyalaya",
    "name_hindi": "\u0921\u0949. \u0939\u0930\u0940\u0938\u093f\u0902\u0939 \u0917\u094c\u0930 \u0935\u093f\u0936\u094d\u0935\u0935\u093f\u0926\u094d\u092f\u093e\u0932\u092f",
    "short_name": "DHSGU",
    "also_known_as": "Sagar University",
    "former_name": "University of Saugar",
    "founded": "18 July 1946",
    "founder": "Dr. Sir Hari Singh Gour",
    "central_university_since": "15 January 2009",
    "address": "University Road, Sagar, Madhya Pradesh 470003",
    "website": "https://www.dhsgsu.edu.in",
    "campus_location": "About 5 km east of Sagar city on the Pathariya hills.",
    "campus_area": "Approximately 1,312.89 acres.",
    "distance_sagar_bus_stand": "About 3 km; about 10 minutes by road.",
    "distance_saugor_railway_station": "About 4-5 km; sources differ.",
    "distance_dhana_airport": "About 13 km.",
    "facilities": (
        "Separate boys and girls hostels (including Nivedita Girls Hostel), "
        "mess for resident scholars, canteens, health centres, sports facilities, "
        "central library, campus Wi-Fi, computer centre, and two nationalised "
        "bank branches on campus."
    ),
    "museum_location": "Dr. Harisingh Gour museum at Valley Campus.",
    "museum_hours": "Monday-Saturday, 10:00 AM to 6:00 PM.",
    "security_contact": "To be added - confirm with the Security Department",
    "registrar_contact": "To be added - confirm with the Registrar's office",
}

ROUTES = [
    {
        "name": "Campus Circle Route (DEMO)",
        "description": "DEMO route; stops and timings are not official.",
        "start_time": "08:00",
        "end_time": "18:00",
        "stops": [
            ("Vivekanand Boys Hostel", "08:05", "08:06", 23.8204050, 78.7700109),
            ("Rani Laxmi Bai Girls Hostel", "08:18", "08:19", 23.8306, 78.7817),
            ("Institute Of Engineering And Technology", "08:32", "08:33", 23.8245, 78.7816),
            ("Department of Computer Science and Applications", "08:36", "08:37", 23.8241, 78.7820),
            ("Department of Criminology and Forensic", "08:48", "08:49", 23.8227, 78.7829),
            ("Nivedita Girls Hostel", "09:00", "09:01", 23.8298, 78.7804),
            ("Jawaharlal Nehru Central Library", "09:15", "09:16", 23.8276, 78.7708),
        ],
        "bus_number": "BUS-101",
        "driver_name": "Demo driver BUS-101 (not official)",
        "status": "ON_TIME",
    },
]

PLACES = [
    ("Jawaharlal Nehru Central Library", "LIBRARY", "DEMO campus place; not official transit data.", 23.8276, 78.7708),
    ("Rani Laxmi Bai Girls Hostel", "HOSTEL", "DEMO campus place; not official transit data.", 23.8306, 78.7817),
    ("Vivekanand Boys Hostel", "HOSTEL", "DEMO campus place; not official transit data.", 23.8204050, 78.7700109),
    ("Valley Campus", "OTHER", "DEMO campus place; not official transit data.", 23.8241, 78.7816),
    ("Department of Computer Science and Applications", "ACADEMIC", "DEMO campus place; not official transit data.", 23.8241, 78.7820),
    ("Institute Of Engineering And Technology", "ACADEMIC", "DEMO campus place; not official transit data.", 23.8245, 78.7816),
    ("Department of Criminology and Forensic", "ACADEMIC", "DEMO campus place; not official transit data.", 23.8227, 78.7829),
    ("Nivedita Girls Hostel", "HOSTEL", "DEMO campus place; not official transit data.", 23.8298, 78.7804),
]

DEMO_ALERTS = [
    (
        "(DEMO) Campus Circle Route Service Notice",
        "DEMO alert for Campus Circle Route (DEMO): sample service notice; not official.",
        "GENERAL",
        1,
    ),
]


def _reset_demo_data(connection):
    connection.execute("DELETE FROM stops WHERE is_verified = 0")
    connection.execute("DELETE FROM buses WHERE is_verified = 0")
    connection.execute(
        """DELETE FROM routes
           WHERE is_verified = 0
             AND id NOT IN (SELECT route_id FROM stops WHERE route_id IS NOT NULL)
             AND id NOT IN (SELECT route_id FROM buses WHERE route_id IS NOT NULL)"""
    )
    connection.execute("DELETE FROM campus_places WHERE is_verified = 0")
    connection.execute("DELETE FROM alerts WHERE is_demo = 1")


def _upsert_university_info(connection):
    connection.executemany(
        "INSERT OR IGNORE INTO university_info (key, value) VALUES (?, ?)",
        UNIVERSITY_INFO.items(),
    )


def _upsert_places(connection):
    for name, category, description, latitude, longitude in PLACES:
        existing = connection.execute(
            "SELECT id FROM campus_places WHERE name = ? AND is_verified = 0 LIMIT 1",
            (name,),
        ).fetchone()
        values = (
            category,
            description,
            latitude,
            longitude,
            "coordinates to be confirmed on site",
        )
        if existing:
            connection.execute(
                """UPDATE campus_places
                   SET category = ?, description = ?, latitude = ?, longitude = ?,
                       is_verified = 0, notes = ?
                   WHERE id = ?""",
                (*values, existing["id"]),
            )
        else:
            connection.execute(
                """INSERT INTO campus_places
                   (name, category, description, latitude, longitude, is_verified, notes)
                   VALUES (?, ?, ?, ?, ?, 0, ?)""",
                (name, *values),
            )


def _upsert_route_and_stops(connection, route):
    existing = connection.execute(
        """SELECT id FROM routes
           WHERE is_verified = 0 AND route_name = ?
           ORDER BY id LIMIT 1""",
        (route["name"],),
    ).fetchone()
    values = (
        route["name"], route["description"], route["start_time"], route["end_time"]
    )
    if existing:
        route_id = existing["id"]
        connection.execute(
            """UPDATE routes SET route_name = ?, description = ?, start_time = ?,
               end_time = ?, is_verified = 0 WHERE id = ?""",
            (*values, route_id),
        )
    else:
        cursor = connection.execute(
            """INSERT INTO routes
               (route_name, description, start_time, end_time, is_verified)
               VALUES (?, ?, ?, ?, 0)""",
            values,
        )
        route_id = cursor.lastrowid

    demo_stops = connection.execute(
        """SELECT id FROM stops WHERE route_id = ? AND is_verified = 0 ORDER BY id""",
        (route_id,),
    ).fetchall()
    for index, (name, arrival, departure, latitude, longitude) in enumerate(route["stops"]):
        stop_values = (
            name,
            arrival,
            departure,
            latitude,
            longitude,
        )
        if index < len(demo_stops):
            connection.execute(
                """UPDATE stops
                   SET stop_name = ?, arrival_time = ?, departure_time = ?,
                       latitude = ?, longitude = ?, is_verified = 0
                   WHERE id = ?""",
                (*stop_values, demo_stops[index]["id"]),
            )
        else:
            connection.execute(
                """INSERT INTO stops
                   (route_id, stop_name, arrival_time, departure_time, latitude,
                    longitude, is_verified)
                   VALUES (?, ?, ?, ?, ?, ?, 0)""",
                (route_id, *stop_values),
            )
    for stop in demo_stops[len(route["stops"]):]:
        connection.execute("DELETE FROM stops WHERE id = ?", (stop["id"],))
    return route_id


def _upsert_bus(connection, route, route_id):
    existing = connection.execute(
        "SELECT id FROM buses WHERE bus_number = ? AND is_verified = 0 LIMIT 1",
        (route["bus_number"],),
    ).fetchone()
    driver_name = f"Demo driver {route['bus_number']} (not official)"
    if existing:
        connection.execute(
            """UPDATE buses SET route_id = ?, driver_name = ?, is_verified = 0
               WHERE id = ?""",
            (route_id, driver_name, existing["id"]),
        )
        return

    first_stop = route["stops"][0]
    connection.execute(
        """INSERT INTO buses
           (bus_number, route_id, driver_name, status, latitude, longitude,
            updated_at, is_verified)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0)""",
        (
            route["bus_number"],
            route_id,
            driver_name,
            route["status"],
            first_stop[3],
            first_stop[4],
            datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        ),
    )


def _upsert_demo_alerts(connection):
    for title, message, alert_type, is_active in DEMO_ALERTS:
        exists = connection.execute(
            "SELECT 1 FROM alerts WHERE title = ? AND is_demo = 1", (title,)
        ).fetchone()
        if not exists:
            connection.execute(
                """INSERT INTO alerts (title, message, alert_type, is_active, is_demo)
                   VALUES (?, ?, ?, ?, 1)""",
                (title, message, alert_type, is_active),
            )


def seed_database(reset=False):
    init_db()
    connection = get_db_connection()
    try:
        _reset_demo_data(connection)

        _upsert_university_info(connection)
        _upsert_places(connection)
        route_ids = {
            route["name"]: _upsert_route_and_stops(connection, route)
            for route in ROUTES
        }
        for route in ROUTES:
            _upsert_bus(connection, route, route_ids[route["name"]])
        _upsert_demo_alerts(connection)
        connection.commit()
        print("DHSGU demo data reset and seeded." if reset else "DHSGU data seeded or updated.")
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed DHSGU demo data.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Clear and recreate demo-only rows while preserving verified data.",
    )
    arguments = parser.parse_args()
    seed_database(reset=arguments.reset)
```

### `backend/requirements.txt`

Purpose: Declares the backend runtime packages and supported version ranges.

```text
Flask>=3.0,<4.0
Flask-Cors>=4.0,<6.0
gunicorn>=23.0,<24.0; platform_system != "Windows"
google-generativeai>=0.8,<1.0
```

### `frontend/package.json`

Purpose: Declares the frontend npm scripts, runtime dependencies, and development/test tools.

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "test": "vitest run",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.20.0",
    "bootstrap": "^5.3.8",
    "leaflet": "^1.9.4",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-leaflet": "^5.0.0",
    "react-router-dom": "^7.18.4"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.3",
    "@testing-library/user-event": "^14.6.7",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.7",
    "@vitejs/plugin-react": "^6.1.1",
    "jsdom": "^30.1.1",
    "oxlint": "^1.81.0",
    "vite": "^8.3.0",
    "vitest": "^5.0.3"
  }
}
```

### `frontend/vercel.json`

Purpose: Rewrites requests to the SPA entry document so React Router can resolve deep links.

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### `frontend/src/services/api.js`

Purpose: Creates the Axios client, applies API base/timeout defaults, and attaches a session PIN to requests.

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000',
  timeout: 70000,
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const pin = window.sessionStorage.getItem('dhsgu-driver-pin')
    if (pin) {
      config.headers['X-Driver-Pin'] = pin
    }
  }
  return config
})

export default api
```

### `frontend/src/services/roadRoutingService.js`

Purpose: Requests and validates OSRM geometry per adjacent stop pair, applies strict/relaxed detour guards, and merges straight fallbacks.

```javascript
const ROUTING_TIMEOUT_MS = 6000

function haversineDistanceKm(start, end) {
  const radians = Math.PI / 180
  const latitude1 = Number(start.latitude) * radians
  const latitude2 = Number(end.latitude) * radians
  const latitudeDelta = latitude2 - latitude1
  const longitudeDelta = (Number(end.longitude) - Number(start.longitude)) * radians
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

async function fetchRoadCandidate(start, end, directDistanceKm, detourFactor, extraKm) {
  let timeoutId

  try {
    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), ROUTING_TIMEOUT_MS)
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`,
      { signal: controller.signal },
    )
    if (!response.ok) {
      return null
    }

    const result = await response.json()
    const route = result?.code === 'Ok' ? result.routes?.[0] : null
    const coordinates = route?.geometry?.coordinates
    const roadDistanceKm = route?.distance / 1000
    const maxRoadDistanceKm = Math.max(
      detourFactor * directDistanceKm,
      directDistanceKm + extraKm,
    )
    const validCoordinates = Array.isArray(coordinates)
      && coordinates.length >= 2
      && coordinates.every((coordinate) => (
        Array.isArray(coordinate)
        && coordinate.length >= 2
        && Number.isFinite(coordinate[0])
        && Number.isFinite(coordinate[1])
      ))

    if (
      !validCoordinates
      || !Number.isFinite(roadDistanceKm)
      || roadDistanceKm < 0
      || roadDistanceKm > maxRoadDistanceKm
    ) {
      return null
    }

    return { coordinates, distanceKm: roadDistanceKm, roadUsed: true }
  } catch {
    return null
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}

async function fetchRoadSegment(start, end) {
  const directDistanceKm = haversineDistanceKm(start, end)
  const straightCoordinates = [
    [Number(start.longitude), Number(start.latitude)],
    [Number(end.longitude), Number(end.latitude)],
  ]
  const strictCandidate = await fetchRoadCandidate(start, end, directDistanceKm, 2.2, 3)
  if (strictCandidate) return strictCandidate

  const relaxedCandidate = await fetchRoadCandidate(start, end, directDistanceKm, 3.5, 5)
  return relaxedCandidate || {
    coordinates: straightCoordinates,
    distanceKm: directDistanceKm,
    roadUsed: false,
  }
}

export async function fetchRoadRoute(stops) {
  if (
    !Array.isArray(stops)
    || stops.length < 2
    || stops.some((stop) => (
      !Number.isFinite(Number(stop.latitude))
      || !Number.isFinite(Number(stop.longitude))
    ))
  ) {
    return null
  }

  const segments = await Promise.all(
    stops.slice(1).map((stop, index) => fetchRoadSegment(stops[index], stop)),
  )
  const coordinates = []
  let distanceKm = 0
  let roadUsed = false

  for (const segment of segments) {
    distanceKm += segment.distanceKm
    roadUsed ||= segment.roadUsed
    for (const coordinate of segment.coordinates) {
      const previous = coordinates[coordinates.length - 1]
      if (previous?.[0] === coordinate[0] && previous?.[1] === coordinate[1]) continue
      coordinates.push(coordinate)
    }
  }

  return {
    coordinates,
    distanceKm,
    durationMin: (distanceKm / 20) * 60,
    roadUsed,
  }
}
```

### `frontend/src/services/gpsRecorderService.js`

Purpose: Records browser GPS fixes, filters/caps them, tracks distance, reports location errors, and returns rounded coordinates on stop.

```javascript
const MAX_ACCURACY_METRES = 30
const MIN_POINT_DISTANCE_METRES = 10
const MAX_RECORDED_POINTS = 2000
const EARTH_RADIUS_METRES = 6371000
const WATCH_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 15000,
}

let watchId = null
let activeSession = 0
let isRecording = false
let points = []
let distanceMetres = 0

function distanceBetween(start, end) {
  const radians = Math.PI / 180
  const latitude1 = start[0] * radians
  const latitude2 = end[0] * radians
  const latitudeDelta = (end[0] - start[0]) * radians
  const longitudeDelta = (end[1] - start[1]) * radians
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2
  return EARTH_RADIUS_METRES * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function clearActiveWatch() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
}

function locationErrorMessage(error) {
  const messages = {
    1: 'Location permission was denied. Allow location access and try again.',
    2: 'GPS location is unavailable. Check the device location settings and try again.',
    3: 'GPS location timed out. Waiting for another update.',
  }
  return messages[Number(error?.code)] || 'Unable to read GPS location. Try again.'
}

export function start(onPoint, onError = () => {}) {
  clearActiveWatch()
  activeSession += 1
  const session = activeSession
  points = []
  distanceMetres = 0
  isRecording = true

  if (typeof navigator === 'undefined' || !navigator.geolocation?.watchPosition) {
    isRecording = false
    onError('Location is unavailable in this browser.', true)
    return false
  }

  try {
    watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (!isRecording || session !== activeSession || points.length >= MAX_RECORDED_POINTS) return
        const latitude = Number(coords.latitude)
        const longitude = Number(coords.longitude)
        const accuracy = Number(coords.accuracy)
        if (
          !Number.isFinite(latitude)
          || !Number.isFinite(longitude)
          || !Number.isFinite(accuracy)
          || accuracy < 0
          || accuracy > MAX_ACCURACY_METRES
        ) {
          return
        }

        const point = [latitude, longitude]
        const previous = points.at(-1)
        if (previous) {
          const segmentDistance = distanceBetween(previous, point)
          if (segmentDistance < MIN_POINT_DISTANCE_METRES) return
          distanceMetres += segmentDistance
        }

        points.push(point)
        onPoint({ latitude, longitude })
        if (points.length >= MAX_RECORDED_POINTS) clearActiveWatch()
      },
      (error) => {
        if (!isRecording || session !== activeSession) return
        const isFatal = Number(error?.code) === 1 || Number(error?.code) === 2
        if (isFatal) {
          isRecording = false
          activeSession += 1
          clearActiveWatch()
        }
        onError(locationErrorMessage(error), isFatal)
      },
      WATCH_OPTIONS,
    )
    return true
  } catch (error) {
    isRecording = false
    activeSession += 1
    clearActiveWatch()
    onError(locationErrorMessage(error), true)
    return false
  }
}

export function stop() {
  isRecording = false
  activeSession += 1
  clearActiveWatch()
  return points.map(([latitude, longitude]) => [
    Number(latitude.toFixed(6)),
    Number(longitude.toFixed(6)),
  ])
}

export function totalDistanceMetres() {
  return distanceMetres
}
```

### `backend/routes.py`

Purpose: Defines API request validation, demo driver PIN checks, Pollinations/offline chat, and all university, place, route, bus, and alert endpoints.

```python
import hmac
import math
import os
from datetime import datetime, timezone
import urllib.parse
import urllib.request

from flask import Blueprint, current_app, jsonify, request

from database import get_db_connection


api = Blueprint("api", __name__)

BUS_STATUSES = {"ON_TIME", "DELAYED", "IN_TRANSIT", "OFFLINE"}
ALERT_TYPES = {"DELAY", "ROUTE_CHANGE", "CANCELLATION", "GENERAL"}
PLACE_CATEGORIES = {
    "GATE", "HOSTEL", "ACADEMIC", "LIBRARY", "AUDITORIUM", "HEALTH",
    "BANK", "CANTEEN", "SPORTS", "GARDEN", "MUSEUM", "SCHOOL",
    "SECURITY", "OTHER",
}


def _error(message, status_code):
    return jsonify({"error": message}), status_code


def _json_object():
    body = request.get_json(silent=True)
    return body if isinstance(body, dict) else None


def _is_active_value(value):
    if isinstance(value, bool):
        return int(value)
    if type(value) is int and value in (0, 1):
        return value
    return None


def _driver_pin_error():
    # This is a demo safeguard, not real authentication.
    configured_pin = os.getenv("DRIVER_PIN")
    # Use the demo default only when unset; an explicit blank disables the check.
    expected_pin = "dhsgu2026" if configured_pin is None else configured_pin
    if expected_pin != "" and not hmac.compare_digest(
        request.headers.get("X-Driver-Pin", ""), expected_pin
    ):
        return _error("A valid X-Driver-Pin header is required", 401)
    return None


def _offline_chat_reply(message):
    normalized = message.casefold()
    if any(term in normalized for term in (
        "safe", "safety", "emergency", "security", "help", "ragging",
        "harassment", "night", "unsafe", "contact", "helpline",
    )):
        return (
            "For immediate assistance, call the Campus Security Control Room "
            "(24x7 helpline) at 07582-265810 immediately."
        )
    if any(term in normalized for term in ("delay", "alert", "cancel", "change")):
        return (
            "I am currently in offline demo mode. Please check the Alerts page "
            "for live updates."
        )
    if any(term in normalized for term in ("where", "location", "directions", "find")):
        return (
            "I am currently in offline demo mode. Check Places or the Live Map "
            "for campus locations; map coordinates are demonstration data and "
            "are not official DHSGU directions."
        )
    return (
        "I am currently in offline demo mode. I can help with DHSGU transit and "
        "campus-place questions when the assistant is online. Please check the "
        "Routes, Places, and Alerts pages for current app data."
    )


@api.post("/chat")
def chat():
    body = _json_object()
    if body is None:
        return _error("Request body must be a JSON object", 400)

    message = body.get("message")
    if not isinstance(message, str) or not message.strip():
        return _error("Message is required", 400)
    if len(message) > 2000:
        return _error("Message must be 2000 characters or fewer", 400)

    try:
        prompt = (
            "You are the DHSGU Transit & Safety Assistant. The campus bus route stops are: "
            "Vivekanand Boys Hostel, Rani Laxmi Bai Girls Hostel, Institute Of Engineering And Technology, "
            "Department of Computer Science and Applications, Department of Criminology and Forensic, "
            "Nivedita Girls Hostel, Jawaharlal Nehru Central Library. "
            "Campus Security Control Room (24x7 emergency helpline): 07582-265810. "
            "If the user mentions safety, emergencies, ragging, harassment, medical help, or feeling unsafe, "
            "tell them to call this number immediately. Answer the user's question briefly, "
            f"safely, and helpfully. Question: {message}"
        )
        encoded_prompt = urllib.parse.quote(prompt)
        with urllib.request.urlopen(
            f"https://text.pollinations.ai/{encoded_prompt}",
            timeout=12,
        ) as response:
            answer = response.read().decode("utf-8").strip()
        if not answer:
            raise ValueError("Pollinations returned an empty response")
        return jsonify({"answer": answer, "source": "pollinations"})
    except Exception:
        current_app.logger.exception("Pollinations chat request failed")
        return jsonify({"answer": _offline_chat_reply(message), "source": "offline"})


@api.get("/university")
def get_university():
    connection = get_db_connection()
    try:
        rows = connection.execute(
            "SELECT key, value FROM university_info ORDER BY key"
        ).fetchall()
        return jsonify({row["key"]: row["value"] for row in rows})
    finally:
        connection.close()


@api.get("/places")
def get_places():
    category = request.args.get("category")
    if category is not None and category not in PLACE_CATEGORIES:
        return _error("Invalid place category", 400)

    connection = get_db_connection()
    try:
        if category is None:
            places = connection.execute(
                "SELECT * FROM campus_places ORDER BY name, id"
            ).fetchall()
        else:
            places = connection.execute(
                "SELECT * FROM campus_places WHERE category = ? ORDER BY name, id",
                (category,),
            ).fetchall()
        return jsonify([dict(place) for place in places])
    finally:
        connection.close()


@api.get("/places/<int:place_id>")
def get_place(place_id):
    connection = get_db_connection()
    try:
        place = connection.execute(
            "SELECT * FROM campus_places WHERE id = ?", (place_id,)
        ).fetchone()
        if place is None:
            return _error("Campus place not found", 404)
        return jsonify(dict(place))
    finally:
        connection.close()


@api.get("/routes")
def get_routes():
    connection = get_db_connection()
    try:
        routes = connection.execute(
            "SELECT * FROM routes ORDER BY id"
        ).fetchall()
        return jsonify([dict(route) for route in routes])
    finally:
        connection.close()


@api.get("/routes/<int:route_id>")
def get_route(route_id):
    connection = get_db_connection()
    try:
        route = connection.execute(
            "SELECT * FROM routes WHERE id = ?", (route_id,)
        ).fetchone()
        if route is None:
            return _error("Route not found", 404)

        route_data = dict(route)
        stops = connection.execute(
            "SELECT * FROM stops WHERE route_id = ? ORDER BY id", (route_id,)
        ).fetchall()
        route_data["stops"] = [dict(stop) for stop in stops]
        return jsonify(route_data)
    finally:
        connection.close()


@api.get("/buses")
def get_buses():
    connection = get_db_connection()
    try:
        buses = connection.execute(
            """
                 SELECT b.id, b.bus_number, b.route_id, r.route_name, b.driver_name,
                     b.status, b.latitude, b.longitude, b.updated_at, b.is_verified
            FROM buses AS b
            LEFT JOIN routes AS r ON r.id = b.route_id
            ORDER BY b.id
            """
        ).fetchall()
        return jsonify([dict(bus) for bus in buses])
    finally:
        connection.close()


@api.get("/buses/<int:bus_id>")
def get_bus(bus_id):
    connection = get_db_connection()
    try:
        bus = connection.execute(
            """
                 SELECT b.id, b.bus_number, b.route_id, r.route_name, b.driver_name,
                     b.status, b.latitude, b.longitude, b.updated_at, b.is_verified
            FROM buses AS b
            LEFT JOIN routes AS r ON r.id = b.route_id
            WHERE b.id = ?
            """,
            (bus_id,),
        ).fetchone()
        if bus is None:
            return _error("Bus not found", 404)
        return jsonify(dict(bus))
    finally:
        connection.close()


@api.post("/buses/<int:bus_id>/location")
def update_bus_location(bus_id):
    pin_error = _driver_pin_error()
    if pin_error:
        return pin_error

    body = _json_object()
    if body is None:
        return _error("Request body must be a JSON object", 400)

    latitude = body.get("latitude")
    longitude = body.get("longitude")
    valid_latitude = (
        isinstance(latitude, (int, float))
        and not isinstance(latitude, bool)
        and -90 <= latitude <= 90
        and math.isfinite(latitude)
    )
    valid_longitude = (
        isinstance(longitude, (int, float))
        and not isinstance(longitude, bool)
        and -180 <= longitude <= 180
        and math.isfinite(longitude)
    )
    if not valid_latitude or not valid_longitude:
        return _error("Valid latitude and longitude are required", 400)

    updated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    connection = get_db_connection()
    try:
        bus = connection.execute(
            "SELECT id FROM buses WHERE id = ?", (bus_id,)
        ).fetchone()
        if bus is None:
            return _error("Bus not found", 404)

        connection.execute(
            """
            UPDATE buses
            SET latitude = ?, longitude = ?, updated_at = ?
            WHERE id = ?
            """,
            (latitude, longitude, updated_at, bus_id),
        )
        connection.commit()
        return jsonify(
            {
                "message": "Bus location updated successfully",
                "bus_id": bus_id,
                "latitude": latitude,
                "longitude": longitude,
                "updated_at": updated_at,
            }
        )
    finally:
        connection.close()


@api.post("/buses/<int:bus_id>/status")
def update_bus_status(bus_id):
    pin_error = _driver_pin_error()
    if pin_error:
        return pin_error

    body = _json_object()
    if body is None:
        return _error("Request body must be a JSON object", 400)

    status = body.get("status")
    if not isinstance(status, str) or status not in BUS_STATUSES:
        return _error("Status must be ON_TIME, DELAYED, IN_TRANSIT, or OFFLINE", 400)

    connection = get_db_connection()
    try:
        cursor = connection.execute(
            "UPDATE buses SET status = ? WHERE id = ?", (status, bus_id)
        )
        if cursor.rowcount == 0:
            return _error("Bus not found", 404)
        connection.commit()
        return jsonify(
            {"message": "Bus status updated successfully", "bus_id": bus_id, "status": status}
        )
    finally:
        connection.close()


@api.get("/alerts")
def get_alerts():
    connection = get_db_connection()
    try:
        alerts = connection.execute(
            "SELECT * FROM alerts ORDER BY created_at DESC, id DESC"
        ).fetchall()
        return jsonify([dict(alert) for alert in alerts])
    finally:
        connection.close()


@api.post("/alerts")
def create_alert():
    pin_error = _driver_pin_error()
    if pin_error:
        return pin_error

    body = _json_object()
    if body is None:
        return _error("Request body must be a JSON object", 400)

    title = body.get("title")
    message = body.get("message")
    alert_type = body.get("alert_type")
    is_active = _is_active_value(body.get("is_active"))
    if not isinstance(title, str) or not title.strip():
        return _error("Title is required", 400)
    if not isinstance(message, str) or not message.strip():
        return _error("Message is required", 400)
    if not isinstance(alert_type, str) or alert_type not in ALERT_TYPES:
        return _error("Invalid alert type", 400)
    if is_active is None:
        return _error("is_active must be true, false, 1, or 0", 400)

    connection = get_db_connection()
    try:
        cursor = connection.execute(
            """
            INSERT INTO alerts (title, message, alert_type, is_active)
            VALUES (?, ?, ?, ?)
            """,
            (title.strip(), message.strip(), alert_type, is_active),
        )
        alert_id = cursor.lastrowid
        connection.commit()
        return jsonify(
            {"message": "Alert created successfully", "alert_id": alert_id}
        ), 201
    finally:
        connection.close()


@api.patch("/alerts/<int:alert_id>")
def update_alert(alert_id):
    pin_error = _driver_pin_error()
    if pin_error:
        return pin_error

    body = _json_object()
    if body is None:
        return _error("Request body must be a JSON object", 400)

    is_active = _is_active_value(body.get("is_active"))
    if is_active is None:
        return _error("is_active must be true, false, 1, or 0", 400)

    connection = get_db_connection()
    try:
        cursor = connection.execute(
            "UPDATE alerts SET is_active = ? WHERE id = ?", (is_active, alert_id)
        )
        if cursor.rowcount == 0:
            return _error("Alert not found", 404)
        connection.commit()
        return jsonify(
            {
                "message": "Alert updated successfully",
                "alert_id": alert_id,
                "is_active": bool(is_active),
            }
        )
    finally:
        connection.close()
```

### `frontend/src/pages/LiveMapPage.jsx`

Purpose: Loads live buses, route stops, and places; renders the Leaflet map, OSRM geometry, route itinerary, and animated BUS-101 demo marker.

```jsx
import { useEffect, useState } from 'react'
import L from 'leaflet'
import { useSearchParams } from 'react-router-dom'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './LiveMapPage.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Loader from '../components/Loader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import DemoBadge from '../components/DemoBadge.jsx'
import { UNIVERSITY } from '../config/university.js'
import { getBuses, getRouteDetails, getRoutes } from '../services/busService.js'
import { getPlaces } from '../services/placeService.js'
import { fetchRoadRoute } from '../services/roadRoutingService.js'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const BUS_MARKER_CLASSES = {
  ON_TIME: 'bg-success',
  DELAYED: 'bg-danger',
  IN_TRANSIT: 'bg-primary',
  OFFLINE: 'bg-secondary',
}

const PLACE_MARKER_CLASSES = {
  GATE: 'bg-dark',
  HOSTEL: 'bg-warning',
  ACADEMIC: 'bg-primary',
  LIBRARY: 'bg-success',
  AUDITORIUM: 'bg-danger',
  HEALTH: 'bg-info',
  BANK: 'bg-secondary',
  CANTEEN: 'bg-warning',
  SPORTS: 'bg-success',
  GARDEN: 'bg-success',
  MUSEUM: 'bg-danger',
  SCHOOL: 'bg-primary',
  SECURITY: 'bg-dark',
  OTHER: 'bg-secondary',
}

const DEMO_ROUTE_NAME = 'Campus Circle Route (DEMO)'
const BUS_SIMULATION_INTERVAL_MS = 1000
const BUS_SIMULATION_METERS_PER_TICK = 300

function busIcon(status) {
  const color = BUS_MARKER_CLASSES[status] || 'bg-secondary'
  return L.divIcon({
    className: '',
    html: `<span class="d-block rounded-circle border border-2 border-white shadow ${color}" style="width: 20px; height: 20px"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  })
}

function demoBusIcon() {
  return L.divIcon({
    className: 'live-map-demo-bus-icon',
    html: '<span class="live-map-demo-bus-marker"><span class="live-map-demo-bus-square"><span class="live-map-demo-bus-glyph"></span></span><span class="live-map-demo-bus-label">BUS-101</span></span>',
    iconSize: [72, 48],
    iconAnchor: [36, 18],
    popupAnchor: [0, -18],
  })
}

function placeIcon(category) {
  const color = PLACE_MARKER_CLASSES[category] || 'bg-secondary'
  return L.divIcon({
    className: '',
    html: `<span class="d-flex align-items-center justify-content-center border border-2 border-white rounded-1 shadow ${color} text-white" style="width: 20px; height: 20px; font-size: 10px">P</span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  })
}

function hasCoordinates(item) {
  return item.latitude != null
    && item.longitude != null
    && Number.isFinite(Number(item.latitude))
    && Number.isFinite(Number(item.longitude))
}

function haversineDistanceKm(stops) {
  let distance = 0
  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1]
    const current = stops[index]
    const radians = Math.PI / 180
    const latitudeDelta = (Number(current.latitude) - Number(previous.latitude)) * radians
    const longitudeDelta = (Number(current.longitude) - Number(previous.longitude)) * radians
    const latitude1 = Number(previous.latitude) * radians
    const latitude2 = Number(current.latitude) * radians
    const haversine = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2
    distance += 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  }
  return distance
}

function distanceMetersBetween(start, end) {
  const radians = Math.PI / 180
  const latitude1 = start[0] * radians
  const latitude2 = end[0] * radians
  const latitudeDelta = (end[0] - start[0]) * radians
  const longitudeDelta = (end[1] - start[1]) * radians
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function positionAlongRoute(positions, distanceMeters) {
  let remainingDistance = distanceMeters
  for (let index = 1; index < positions.length; index += 1) {
    const start = positions[index - 1]
    const end = positions[index]
    const segmentDistance = distanceMetersBetween(start, end)
    if (segmentDistance === 0) continue
    if (remainingDistance <= segmentDistance) {
      const progress = remainingDistance / segmentDistance
      return [
        start[0] + (end[0] - start[0]) * progress,
        start[1] + (end[1] - start[1]) * progress,
      ]
    }
    remainingDistance -= segmentDistance
  }
  return positions[0]
}

function waypointMarkerOptions(index, total) {
  if (index === 0) {
    return { radius: 6, pathOptions: { color: '#fff', weight: 2, fillColor: '#1a73e8', fillOpacity: 1 } }
  }
  if (index === total - 1) {
    return { radius: 7, pathOptions: { color: '#fff', weight: 2, fillColor: '#ea4335', fillOpacity: 1 } }
  }
  return { radius: 5, pathOptions: { color: '#80868b', weight: 2, fillColor: '#fff', fillOpacity: 1 } }
}

function MapController({ place }) {
  const map = useMap()

  useEffect(() => {
    if (place && hasCoordinates(place)) {
      map.flyTo([Number(place.latitude), Number(place.longitude)], 17, { duration: 0.8 })
    }
  }, [map, place])

  return null
}

function LiveMapPage() {
  const [searchParams] = useSearchParams()
  const [buses, setBuses] = useState([])
  const [places, setPlaces] = useState([])
  const [stops, setStops] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [placesError, setPlacesError] = useState('')
  const [stopsError, setStopsError] = useState('')
  const [showStops, setShowStops] = useState(false)
  const [showPlaces, setShowPlaces] = useState(true)
  const [showSimulatedBus, setShowSimulatedBus] = useState(true)
  const [busSimulationDistance, setBusSimulationDistance] = useState(0)
  const [isItineraryOpen, setIsItineraryOpen] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [roadRoutingResult, setRoadRoutingResult] = useState({
    routeKey: '',
    roadRoute: null,
    roadUsed: null,
  })

  useEffect(() => {
    let isCurrent = true
    let refreshInProgress = false
    const refreshBuses = async () => {
      if (refreshInProgress) return
      refreshInProgress = true
      try {
        const data = await getBuses()
        if (isCurrent) {
          setBuses(data)
          setLastUpdated(new Date())
          setError('')
        }
      } catch {
        if (isCurrent) {
          setError('Unable to refresh bus locations. Check that the backend is running.')
        }
      } finally {
        refreshInProgress = false
        if (isCurrent) setIsLoading(false)
      }
    }

    refreshBuses()
    const intervalId = window.setInterval(refreshBuses, 10000)
    return () => {
      isCurrent = false
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    let isCurrent = true
    getPlaces()
      .then((data) => {
        if (isCurrent) setPlaces(data)
      })
      .catch(() => {
        if (isCurrent) setPlacesError('Unable to load campus places.')
      })
    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    let isCurrent = true
    getRoutes()
      .then((routes) => Promise.all(routes.map((route) => getRouteDetails(route.id))))
      .then((routes) => {
        if (isCurrent) {
          setStops(routes.flatMap((route) => route.stops.map((stop) => ({
            ...stop,
            route_name: route.route_name,
          }))))
        }
      })
      .catch(() => {
        if (isCurrent) setStopsError('Unable to load route stops.')
      })
    return () => {
      isCurrent = false
    }
  }, [])

  const mappedBuses = buses.filter(hasCoordinates)
  const mappedPlaces = places.filter(hasCoordinates)
  const mappedStops = stops.filter(hasCoordinates)
  const routeStops = mappedStops.filter((stop) => stop.route_name === DEMO_ROUTE_NAME)
  const routeKey = routeStops
    .map((stop) => `${stop.longitude},${stop.latitude}`)
    .join(';')

  useEffect(() => {
    let isCurrent = true
    if (!routeKey) {
      return () => {
        isCurrent = false
      }
    }

    const routingStops = routeKey.split(';').map((coordinate) => {
      const [longitude, latitude] = coordinate.split(',').map(Number)
      return { longitude, latitude }
    })
    if (routingStops.length < 2) {
      return () => {
        isCurrent = false
      }
    }

    fetchRoadRoute(routingStops).then((result) => {
      if (isCurrent) {
        setRoadRoutingResult({
          routeKey,
          roadRoute: result,
          roadUsed: result?.roadUsed ?? null,
        })
      }
    })

    return () => {
      isCurrent = false
    }
  }, [routeKey])

  const hasRoadRoutingResult = roadRoutingResult.routeKey === routeKey
  const roadRoute = hasRoadRoutingResult ? roadRoutingResult.roadRoute : null
  const roadRoutingUnavailable = hasRoadRoutingResult && roadRoutingResult.roadUsed === false
  const directRoutePositions = routeStops
    .map((stop) => [Number(stop.latitude), Number(stop.longitude)])
  const routePositions = roadRoute
    ? roadRoute.coordinates.map(([longitude, latitude]) => [latitude, longitude])
    : directRoutePositions
  const routeLengthMeters = routePositions.slice(1).reduce((distance, position, index) => (
    distance + distanceMetersBetween(routePositions[index], position)
  ), 0)
  const simulatedBusPosition = routeLengthMeters > 0
    ? positionAlongRoute(routePositions, busSimulationDistance % routeLengthMeters)
    : null
  const routeDistanceKm = roadRoute?.distanceKm ?? haversineDistanceKm(routeStops)
  const routeMinutes = roadRoute
    ? Math.round(roadRoute.durationMin)
    : Math.round((routeDistanceKm / 20) * 60)
  const routeSummary = routeStops.length > 1
    ? `≈ ${routeDistanceKm.toFixed(1)} km • ~${routeMinutes} min`
    : 'Loading route details'
  const routeName = routeStops[0]?.route_name || DEMO_ROUTE_NAME
  const selectedPlaceId = searchParams.get('place')
  const selectedPlace = mappedPlaces.find((place) => String(place.id) === selectedPlaceId)

  useEffect(() => {
    setBusSimulationDistance(0)
    if (!showSimulatedBus || routeLengthMeters <= 0) return undefined

    const intervalId = window.setInterval(() => {
      setBusSimulationDistance((distance) => (
        (distance + BUS_SIMULATION_METERS_PER_TICK) % routeLengthMeters
      ))
    }, BUS_SIMULATION_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [routeKey, routeLengthMeters, roadRoute, showSimulatedBus])

  return (
    <main className="live-map-page">
      <header className="live-map-toolbar">
        <div>
          <h1>Live bus map</h1>
          <p>Bus locations refresh every 10 seconds.</p>
        </div>
        <p className="live-map-updated" aria-live="polite">
          Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Waiting for data'}
        </p>
      </header>

      <div className="live-map-stage">
        <MapContainer
          center={UNIVERSITY.MAP_CENTER}
          zoom={UNIVERSITY.MAP_ZOOM}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            className="gm-muted-tiles"
          />
          <MapController place={selectedPlace} />
          {routePositions.length > 1 && (
            <>
              <Polyline
                positions={routePositions}
                pathOptions={{
                  color: '#0b57d0',
                  weight: 9,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Polyline
                positions={routePositions}
                pathOptions={{
                  color: '#1a73e8',
                  weight: 6,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </>
          )}
          {mappedBuses.map((bus) => {
            const isSimulatedBus = showSimulatedBus
              && bus.bus_number === 'BUS-101'
              && simulatedBusPosition
            return (
              <Marker
                key={bus.id}
                position={isSimulatedBus
                  ? simulatedBusPosition
                  : [Number(bus.latitude), Number(bus.longitude)]}
                icon={isSimulatedBus ? demoBusIcon() : busIcon(bus.status)}
              >
                <Popup>
                  <div className="d-grid gap-1">
                    <strong>{bus.bus_number}</strong>
                    <span>{bus.route_name || 'Unassigned route'}</span>
                    <StatusBadge status={bus.status} />
                    <DemoBadge isVerified={bus.is_verified} />
                  </div>
                </Popup>
              </Marker>
            )
          })}
          {showStops && mappedStops.map((stop) => {
            const routeIndex = routeStops.findIndex((routeStop) => routeStop.id === stop.id)
            const markerOptions = routeIndex >= 0
              ? waypointMarkerOptions(routeIndex, routeStops.length)
              : { radius: 6, pathOptions: { color: '#664d03', fillColor: '#ffc107', fillOpacity: 0.9 } }
            return (
              <CircleMarker
                key={`stop-${stop.id}`}
                center={[Number(stop.latitude), Number(stop.longitude)]}
                radius={markerOptions.radius}
                pathOptions={markerOptions.pathOptions}
              >
                <Popup>
                  <div className="d-grid gap-1">
                    <strong>{stop.stop_name}</strong>
                    <span>{stop.route_name}</span>
                    <DemoBadge isVerified={stop.is_verified} />
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
          {showPlaces && mappedPlaces.map((place) => (
            <Marker
              key={`place-${place.id}`}
              position={[Number(place.latitude), Number(place.longitude)]}
              icon={placeIcon(place.category)}
            >
              <Popup>
                <div className="d-grid gap-1">
                  <strong>{place.name}</strong>
                  <span>{place.category}</span>
                  <DemoBadge isVerified={place.is_verified} />
                  <span className="small">{place.notes}</span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className="live-map-controls" role="group" aria-label="Map layers">
          <label className={`live-map-chip${showStops ? ' is-selected' : ''}`}>
            <input
              id="show-stops"
              type="checkbox"
              checked={showStops}
              onChange={(event) => setShowStops(event.target.checked)}
            />
            <span className="live-map-chip-icon live-map-chip-stops" aria-hidden="true" />
            <span>Stops</span>
          </label>
          <label className={`live-map-chip${showPlaces ? ' is-selected' : ''}`}>
            <input
              id="show-places"
              type="checkbox"
              checked={showPlaces}
              onChange={(event) => setShowPlaces(event.target.checked)}
            />
            <span className="live-map-chip-icon live-map-chip-places" aria-hidden="true" />
            <span>Campus places</span>
          </label>
          <label className={`live-map-chip${showSimulatedBus ? ' is-selected' : ''}`}>
            <input
              id="simulate-bus"
              type="checkbox"
              checked={showSimulatedBus}
              onChange={(event) => setShowSimulatedBus(event.target.checked)}
            />
            <span className="live-map-chip-icon live-map-chip-simulate" aria-hidden="true" />
            <span>Simulate bus</span>
          </label>
        </div>

        <aside
          className={`live-map-itinerary${isItineraryOpen ? ' is-expanded' : ''}`}
          data-testid="route-itinerary"
          aria-label="Route itinerary"
          aria-expanded={isItineraryOpen}
        >
          <header className="live-map-itinerary-header">
            <div>
              <h2>{routeName}</h2>
              <p data-testid="route-summary">{routeSummary}</p>
              {roadRoutingUnavailable && (
                <span className="live-map-route-note">
                  Road routing unavailable - showing direct demo line.
                </span>
              )}
            </div>
            <button
              className="live-map-sheet-toggle"
              type="button"
              aria-controls="live-map-itinerary-list"
              aria-expanded={isItineraryOpen}
              aria-label={isItineraryOpen ? 'Collapse route details' : 'Expand route details'}
              onClick={() => setIsItineraryOpen((isOpen) => !isOpen)}
            />
          </header>
          <ol className="live-map-itinerary-list" id="live-map-itinerary-list">
            {routeStops.map((stop, index) => {
              const waypointClass = index === 0
                ? 'is-start'
                : index === routeStops.length - 1 ? 'is-destination' : 'is-intermediate'
              return (
                <li className={`live-map-itinerary-stop ${waypointClass}`} key={stop.id}>
                  <span className="live-map-itinerary-dot" aria-hidden="true" />
                  <span className="live-map-itinerary-copy">
                    <span className="live-map-stop-name">{stop.stop_name}</span>
                    <span className="live-map-stop-coordinates">
                      {Number(stop.latitude)}, {Number(stop.longitude)}
                    </span>
                  </span>
                </li>
              )
            })}
            {routeStops.length === 0 && (
              <li className="live-map-itinerary-empty">Route stops are unavailable.</li>
            )}
          </ol>
          <div className="live-map-itinerary-footer"><DemoBadge isVerified={0} /></div>
        </aside>

        {(placesError || stopsError) && (
          <div className="live-map-data-errors" role="status">
            {placesError && <span>{placesError}</span>}
            {stopsError && <span>{stopsError}</span>}
          </div>
        )}
        {isLoading && (
          <div className="live-map-loading"><Loader label="Loading bus locations" /></div>
        )}
        {error && <div className="live-map-error"><ErrorMessage message={error} /></div>}
        {!isLoading && mappedBuses.length === 0 && !error && (
          <p className="live-map-empty">No bus locations are available.</p>
        )}
      </div>
    </main>
  )
}

export default LiveMapPage
```

### `frontend/src/components/ChatWidget.jsx`

Purpose: Renders the assistant panel, sends chat messages, displays loading/error states, and keeps the security helpline link visible while open.

```jsx
import { useEffect, useRef, useState } from 'react'
import Loader from './Loader.jsx'
import { sendChatMessage } from '../services/chatService.js'

const WELCOME_MESSAGE =
  'Ask about DHSGU facts, campus places, routes, or alerts. Route and location details marked Demo data are not official.'

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'assistant', text: WELCOME_MESSAGE },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const messageEndRef = useRef(null)

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages, isLoading])

  async function handleSubmit(event) {
    event.preventDefault()
    const question = message.trim()
    if (!question || isLoading) return

    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: 'user', text: question },
    ].slice(-21))
    setMessage('')
    setIsLoading(true)

    try {
      const result = await sendChatMessage(question)
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-assistant`, role: 'assistant', text: result.answer },
      ].slice(-21))
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant-error`,
          role: 'assistant',
          text: error.response?.data?.error || 'The assistant is unavailable. Please try again later.',
        },
      ].slice(-21))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="position-fixed bottom-0 end-0 m-3 m-md-4" style={{ zIndex: 1055 }}>
      {isOpen && (
        <section
          className="card shadow mb-3"
          aria-label="DHSGU Transit and Safety Assistant"
          style={{ width: 'min(360px, calc(100vw - 2rem))' }}
        >
          <header className="card-header d-flex justify-content-between align-items-center gap-2">
            <div>
              <h2 className="h6 mb-0">DHSGU Transit &amp; Safety Assistant</h2>
              <span className="small text-body-secondary">AI answers use available university data</span>
            </div>
            <button
              className="btn-close"
              type="button"
              aria-label="Close assistant"
              onClick={() => setIsOpen(false)}
            />
          </header>
          <div
            className="card-body d-flex flex-column gap-2 overflow-auto"
            aria-live="polite"
            style={{ height: 'min(52vh, 380px)' }}
          >
            {messages.map((item) => (
              <div
                key={item.id}
                className={`d-flex ${item.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
              >
                <p
                  className={`mb-0 p-2 rounded ${item.role === 'user' ? 'bg-primary text-white' : 'bg-body-tertiary'}`}
                  style={{ maxWidth: '88%', whiteSpace: 'pre-wrap' }}
                >
                  {item.text}
                </p>
              </div>
            ))}
            {isLoading && <Loader label="Assistant is thinking" />}
            <div ref={messageEndRef} />
          </div>
          <p className="small text-body-secondary text-center border-top px-2 py-2 mb-0">
            Emergency? Call Campus Security Control Room:{' '}
            <a className="text-reset fw-semibold text-nowrap" href="tel:+917582265810">
              07582-265810
            </a>
          </p>
          <form className="card-footer" onSubmit={handleSubmit}>
            <label className="visually-hidden" htmlFor="assistant-message">Ask a question</label>
            <div className="input-group">
              <input
                className="form-control"
                id="assistant-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask a campus question"
                maxLength={2000}
                disabled={isLoading}
              />
              <button className="btn btn-primary" type="submit" disabled={isLoading || !message.trim()}>
                Send
              </button>
            </div>
          </form>
        </section>
      )}
      <div className="d-flex justify-content-end">
        <button
          className="btn btn-primary shadow"
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close DHSGU assistant' : 'Open DHSGU assistant'}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? 'Close assistant' : 'Ask DHSGU'}
        </button>
      </div>
    </div>
  )
}

export default ChatWidget
```

### Remaining source inventory

These files are part of the repository but are not reproduced in full here. Approximate line counts are nonblank source lines. The complete source remains in the repository.

| File path | Purpose | Key export / entry | Approx. lines |
| --- | --- | --- | ---: |
| `backend/database.py` | SQLite connection, schema initialization, compatibility migrations. | `get_db_connection`, `init_db` | 101 |
| `backend/tests/test_university_api.py` | Backend API, PIN, seed, and chat tests. | `UniversityPlaceApiTests` | 552 |
| `frontend/index.html` | Vite HTML shell and React mount element. | `#root` | 14 |
| `frontend/vite.config.js` | React plugin, jsdom test environment, setup-file config. | `defineConfig` | 8 |
| `frontend/src/main.jsx` | Creates React root and BrowserRouter. | `createRoot` entry | 12 |
| `frontend/src/App.jsx` | Shared shell and route registration. | `App` | 35 |
| `frontend/src/config/university.js` | DHSGU labels, contact/website, map defaults, descriptive facts. | `UNIVERSITY` | 20 |
| `frontend/src/config/userTypes.js` | Student/Faculty/Driver types and landing paths. | `USER_TYPES`, `USER_LANDING_PATHS`, `getStoredUserType` | 14 |
| `frontend/src/pages/AboutPage.jsx` | University facts, travel distances, security contact. | `AboutPage` | 101 |
| `frontend/src/pages/AlertsPage.jsx` | Alert loading/list and error states. | `AlertsPage` | 57 |
| `frontend/src/pages/DriverPanelPage.jsx` | PIN gate, bus updates, alerts, GPS route recorder. | `DriverPanelPage` | 604 |
| `frontend/src/pages/DriverPanelPage.css` | Inline recorder map dimensions and frame. | `.route-recorder-map` rules | 11 |
| `frontend/src/pages/HomePage.jsx` | Campus dashboard summaries and featured alert. | `HomePage` | 112 |
| `frontend/src/pages/LiveMapPage.css` | Map layout, controls, itinerary, marker and responsive styles. | Live Map selectors | 471 |
| `frontend/src/pages/PlacesPage.jsx` | Campus place directory and category selection. | `PlacesPage` | 81 |
| `frontend/src/pages/RouteDetailsPage.jsx` | Route detail and stop table. | `RouteDetailsPage` | 139 |
| `frontend/src/pages/RoutesPage.jsx` | Route list and route-card navigation. | `RoutesPage` | 59 |
| `frontend/src/components/AlertBanner.jsx` | Dismissible alert banner. | `AlertBanner` | 28 |
| `frontend/src/components/AlertCard.jsx` | Alert details and active/demo presentation. | `AlertCard` | 40 |
| `frontend/src/components/DemoBadge.jsx` | Unverified/demo-data badge. | `DemoBadge` | 11 |
| `frontend/src/components/ErrorMessage.jsx` | Shared error presentation. | `ErrorMessage` | 8 |
| `frontend/src/components/Footer.jsx` | Shared demonstration-data footer. | `Footer` | 12 |
| `frontend/src/components/Loader.jsx` | Shared accessible loading state. | `Loader` | 9 |
| `frontend/src/components/Navbar.jsx` | Navigation and user-type selection. | `Navbar` | 86 |
| `frontend/src/components/RouteCard.jsx` | Route summary card. | `RouteCard` | 27 |
| `frontend/src/components/StatusBadge.jsx` | Bus status badge. | `StatusBadge` | 12 |
| `frontend/src/services/alertService.js` | Alert API wrappers. | `getAlerts`, `createAlert`, `updateAlert` | 20 |
| `frontend/src/services/busService.js` | Bus/route reads and bus update requests. | Bus and route service functions | 24 |
| `frontend/src/services/chatService.js` | Chat API wrapper. | `sendChatMessage` | 5 |
| `frontend/src/services/geolocationService.js` | One-shot browser location request and friendly errors. | `getCurrentPosition` | 22 |
| `frontend/src/services/placeService.js` | Campus place API wrappers. | Place service functions | 11 |
| `frontend/src/services/universityService.js` | University information API wrapper. | `getUniversity` | 5 |
| `frontend/src/__tests__/AboutPage.test.jsx` | About facts and Campus Security link test. | Vitest test | 28 |
| `frontend/src/__tests__/AlertBanner.test.jsx` | Alert banner display/dismiss behavior. | Vitest tests | 20 |
| `frontend/src/__tests__/AlertCard.test.jsx` | Alert card rendering/time formatting. | Vitest tests | 21 |
| `frontend/src/__tests__/alertService.test.js` | Alert service request/error behavior. | Vitest tests | 31 |
| `frontend/src/__tests__/AlertsPage.test.jsx` | Alerts list/error state. | Vitest tests | 25 |
| `frontend/src/__tests__/AppRouting.test.jsx` | Role-based route redirects. | Vitest tests | 53 |
| `frontend/src/__tests__/busService.test.js` | Bus/route service requests and errors. | Vitest tests | 42 |
| `frontend/src/__tests__/chatService.test.js` | Chat request contract and errors. | Vitest tests | 26 |
| `frontend/src/__tests__/ChatWidget.test.jsx` | Assistant interaction, history cap, and request states. | Vitest tests | 73 |
| `frontend/src/__tests__/DemoBadge.test.jsx` | Demo badge visibility. | Vitest tests | 13 |
| `frontend/src/__tests__/DriverPanelPage.test.jsx` | Driver gate, updates, recorder, and exports. | Vitest tests | 211 |
| `frontend/src/__tests__/FeedbackComponents.test.jsx` | Loader and error components. | Vitest tests | 13 |
| `frontend/src/__tests__/Footer.test.jsx` | Demonstration disclaimer. | Vitest test | 7 |
| `frontend/src/__tests__/geolocationService.test.js` | One-shot geolocation success/denial. | Vitest tests | 29 |
| `frontend/src/__tests__/gpsRecorderService.test.js` | GPS filters, cap, distance, rounding, errors. | Vitest tests | 84 |
| `frontend/src/__tests__/helpers.js` | React Leaflet/Leaflet and geolocation test mocks. | Test helpers | 90 |
| `frontend/src/__tests__/HomePage.test.jsx` | Home summary/loading/error states. | Vitest tests | 45 |
| `frontend/src/__tests__/LiveMapPage.test.jsx` | Map, routing guards, simulation, polling. | Vitest tests | 383 |
| `frontend/src/__tests__/Navbar.test.jsx` | Navigation and role-specific driver link. | Vitest tests | 23 |
| `frontend/src/__tests__/placeService.test.js` | Place service requests/errors. | Vitest tests | 26 |
| `frontend/src/__tests__/PlacesPage.test.jsx` | Place list/filter/map navigation. | Vitest tests | 45 |
| `frontend/src/__tests__/RouteCard.test.jsx` | Route summary/fallback rendering. | Vitest tests | 31 |
| `frontend/src/__tests__/RouteDetailsPage.test.jsx` | Route detail and error states. | Vitest tests | 47 |
| `frontend/src/__tests__/RoutesPage.test.jsx` | Route list and navigation. | Vitest test | 28 |
| `frontend/src/__tests__/setup.js` | Jest-DOM setup and browser/timer cleanup. | Vitest setup | 14 |
| `frontend/src/__tests__/StatusBadge.test.jsx` | Status badge rendering. | Vitest tests | 14 |
| `frontend/src/__tests__/universityService.test.js` | University service response/error behavior. | Vitest test | 15 |
| `frontend/public/favicon.svg`, `frontend/public/icons.svg` | Public browser vector assets. | Static assets | n/a |
| `frontend/src/assets/hero.png`, `frontend/src/assets/react.svg`, `frontend/src/assets/vite.svg` | Page/template image assets. | Static assets | n/a |

## Part 3 - Appendices

### Appendix A - Test Suite Summary

Latest recorded totals are 18 backend `unittest` cases and 68 frontend Vitest tests across 25 `.test.*` files. Backend suite name: `backend/tests/test_university_api.py`. Frontend test files are:

`AboutPage.test.jsx`, `AlertBanner.test.jsx`, `AlertCard.test.jsx`, `alertService.test.js`, `AlertsPage.test.jsx`, `AppRouting.test.jsx`, `busService.test.js`, `chatService.test.js`, `ChatWidget.test.jsx`, `DemoBadge.test.jsx`, `DriverPanelPage.test.jsx`, `FeedbackComponents.test.jsx`, `Footer.test.jsx`, `geolocationService.test.js`, `gpsRecorderService.test.js`, `HomePage.test.jsx`, `LiveMapPage.test.jsx`, `Navbar.test.jsx`, `placeService.test.js`, `PlacesPage.test.jsx`, `RouteCard.test.jsx`, `RouteDetailsPage.test.jsx`, `RoutesPage.test.jsx`, `StatusBadge.test.jsx`, and `universityService.test.js`.

Coverage includes API validation/CRUD, CORS-independent PIN checks, seed integrity, Pollinations and offline fallback, React page and chat states, map geometry and guard scenarios, simulated bus polling, and GPS recorder filters/export. The build is checked with `npm run build`; lint is `npm run lint`.

### Appendix B - Engineering Case Studies

- **CORS correction:** repository history records a production Vercel-origin correction. Current `app.py` allows both deployed origins, local origins, and optional `FRONTEND_ORIGIN`.
- **SPA 404s:** `frontend/vercel.json` rewrites deep paths to `/index.html` for React Router.
- **Ephemeral database:** `app.py` runs the demo seed at startup; the seeder recreates unverified demo rows while preserving verified data after storage reset.
- **OSRM detours:** repository history introduced per-segment routing and strict/relaxed distance limits; direct geometry is used when both route candidates fail.
- **Tile provider replacement:** history moved from Esri tiles to OSM. Current Leaflet uses the OSM tile endpoint, attribution, and a CSS muted filter.
- **Keyless AI:** Pollinations is called from Flask via built-in `urllib`; a 12-second timeout and keyword-based offline responder cover request failure.
- **GPS calibration:** the browser recorder now keeps fixes at accuracy <= 30 m and spacing >= 10 m, caps at 2,000 points, and exports rounded coordinates.

### Appendix C - Companion Documents

- [Repository README](../README.md)
- [Technical Build Report](TECHNICAL_BUILD_REPORT.md)
- [Demo Day guide](DEMO_DAY.md)
- [CodeCraft Challenge pitch deck](CodeCraft_Challenge_DHSGU_Campus_Bus_Tracker.pptx)
