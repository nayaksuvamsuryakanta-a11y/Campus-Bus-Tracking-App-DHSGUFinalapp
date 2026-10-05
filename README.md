# 🚌 DHSGU Campus Bus Tracker

**Real-time campus transit tracking, routing, and safety assistance for Dr. Harisingh Gour Vishwavidyalaya, Sagar.**

A full-stack web application that lets students and faculty see the campus bus live on a Google-style map, follow its exact itinerary, receive service alerts, and ask an AI assistant campus transit and safety questions — with a PIN-protected driver panel for live updates.

Built by **Suvam**, BCA Undergraduate, for the **CodeCraft Challenge**.

---

## 🌐 Live Demo

| Component | URL |
| :--- | :--- |
| Frontend (Vercel) | https://campus-bus-tracking-app-dhsgu-final.vercel.app |
| Backend API (Render) | https://dhsgu-bus-api.onrender.com |

> **Note:** The backend runs on Render's free tier and may take up to **60 seconds** to wake on first visit.
>
> **Demo driver PIN:** `dhsgu2026`

<!-- Optional: add screenshots to docs/screenshots and uncomment
![Live Map](docs/screenshots/live-map.png)
-->

---

## ✨ Key Features

### 🗺️ Google-Style Live Map
- Clean, light-themed OpenStreetMap basemap with a soft CSS filter for a Google-like look.
- Blue cased route line with waypoint markers (blue start, white intermediates, red destination).
- Floating itinerary panel showing the ordered stops with live distance and time summary.
- **Stops**, **Campus places**, and **Simulate bus** toggles; an animated demo bus travels the route.

### 🛣️ Real-Road Routing with Detour Guard
- Per-segment routing via the free **OSRM** public API so the line follows real streets.
- A **detour-guard algorithm** rejects unreasonable road loops (incomplete map data) and falls back to clean direct segments — the route always looks correct.

### 📍 Real-Time GPS Route Recorder
- Drivers can record the actual bus circuit using live GPS (`watchPosition`).
- Accuracy (≤ 30 m) and distance (≥ 10 m) filtering, 2,000-point cap, live trace preview, and one-tap JSON export.

### 🚨 Complete Alert Lifecycle
- Colour-coded types: **DELAY**, **ROUTE_CHANGE**, **EMERGENCY**, **GENERAL**.
- Live toast notifications across all pages; persistent red banner for emergencies.
- Active / Past / All tabs with type filtering on the Alerts page.
- Emergency alerts carry the **Campus Security Control Room helpline: 07582-265810**.

### 🤖 AI Transit & Safety Assistant
- Keyless **Pollinations.ai** brain (no API keys, no cost) with a 12-second timeout.
- Transparent **offline knowledge-base fallback** — the assistant never fails on stage.
- Safety questions always surface the Control Room helpline.

### 🚦 Driver Panel (PIN-Protected)
- Live location and status updates for the bus (10-second polling on the map).
- Broadcast and deactivate service alerts.

### 👥 Role-Aware Experience
- **Student / Faculty / Driver** selector tailors the interface.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| Frontend | React + Vite | SPA UI, hosted on Vercel |
| Maps | Leaflet + OpenStreetMap tiles | Live map, markers, polylines |
| Routing | OSRM public API | Real-road geometry |
| Backend | Flask + Gunicorn | REST API, hosted on Render |
| Database | SQLite | Routes, stops, buses, alerts, places |
| AI | Pollinations.ai | Keyless chat assistant |
| Testing | Vitest (frontend), unittest (backend) | 76 + 21 automated tests |

---

## 🏗️ Architecture

```
┌────────────────────────┐        ┌────────────────────────┐
│  React SPA (Vercel)    │  HTTPS │  Flask API (Render)    │
│  Leaflet map, alerts,  │───────▶│  REST endpoints, PIN   │
│  chat widget, recorder │  JSON  │  auth, chat ladder     │
└────────────────────────┘        └───────────┬────────────┘
                                              │
                                 ┌────────────▼────────────┐
                                 │  SQLite (ephemeral)     │
                                 │  reseeded at startup    │
                                 └─────────────────────────┘
External: OSM tiles · OSRM routing · Pollinations.ai
```

- The frontend polls bus positions every **10 seconds**.
- The database is **re-seeded on every startup**, making the app immune to ephemeral-disk data loss on Render.

---

## 🔌 REST API Reference

| Method | Path | Purpose | Auth |
| :--- | :--- | :--- | :--- |
| GET | `/api/health` | Service health check | — |
| GET | `/api/routes` | List routes | — |
| GET | `/api/routes/<id>` | Route with ordered stops | — |
| GET | `/api/buses` | Live bus positions | — |
| POST | `/api/buses/<id>/location` | Update bus location | PIN |
| POST | `/api/buses/<id>/status` | Update bus status | PIN |
| GET | `/api/alerts` | List alerts | — |
| POST | `/api/alerts` | Broadcast alert | PIN |
| POST | `/api/alerts/<id>/deactivate` | Deactivate alert | PIN |
| GET | `/api/places` | Campus landmarks | — |
| POST | `/api/chat` | AI assistant | — |

---

## 🚀 Getting Started (Local)

**Backend**
```powershell
cd campus-bus-tracking/backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

**Frontend**
```powershell
cd campus-bus-tracking/frontend
npm install
npm run dev
```

**Environment variables (optional):** `DRIVER_PIN` (defaults to the public demo PIN `dhsgu2026`).

**Tests**
```powershell
# backend (21 tests)
.\venv\Scripts\python.exe -m unittest discover -s tests
# frontend (76 tests)
npm test
```

---

## ☁️ Deployment

- **Vercel:** root directory `campus-bus-tracking/frontend`; SPA deep links preserved by rewrites in `frontend/vercel.json`; auto-deploys on push to `main`.
- **Render:** Gunicorn start command; ephemeral disk with **startup reseeding**; auto-deploys on push to `main`.

---

## 🧠 Engineering Highlights

1. **CORS domain correction** after Vercel project recreation.
2. **SPA deep-link 404 fix** by relocating `vercel.json` into the Vercel root directory.
3. **Ephemeral-database resilience** via idempotent startup seeding.
4. **OSRM detour guard** eliminating 35 km phantom loops from incomplete map data.
5. **Keyless AI activation** with a transparent offline fallback ladder.

---

## 🔐 Security & Limitations

- Parameterized SQL throughout; CORS allow-list; PIN-protected driver writes.
- The demo PIN is public by design for the competition; production use requires a private `DRIVER_PIN`.
- **All routes, stops, timings, and driver data are demonstration data — not official DHSGU vehicle tracking.**

---

## 🗺️ Roadmap

- Multi-bus fleet management with per-route colours.
- ML-based arrival predictions.
- Official university data integration.
- Native mobile app with push notifications.

---

## 📚 Documentation

- [`docs/TECHNICAL_BUILD_REPORT.md`](docs/TECHNICAL_BUILD_REPORT.md) — full build report.
- [`docs/SOURCE_CODE_AND_DOCUMENTATION.md`](docs/SOURCE_CODE_AND_DOCUMENTATION.md) — consolidated source & documentation.
- [`docs/DEMO_DAY.md`](docs/DEMO_DAY.md) — demo-day rehearsal checklist.
- [`docs/CodeCraft_Challenge_DHSGU_Campus_Bus_Tracker.pptx`](docs/CodeCraft_Challenge_DHSGU_Campus_Bus_Tracker.pptx) — pitch deck.

---

## 👤 Author

**Suvam** — BCA Undergraduate · Dr. Harisingh Gour Vishwavidyalaya, Sagar
Built with ❤️ for the CodeCraft Challenge.
