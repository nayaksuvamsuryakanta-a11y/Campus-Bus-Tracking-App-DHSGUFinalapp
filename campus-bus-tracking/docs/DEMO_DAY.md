# Demo Day Rehearsal

## T-15 Minutes

- [ ] Open the Render dashboard for the `dhsgu-bus-api` service.
- [ ] Open [the API health check](https://dhsgu-bus-api.onrender.com/api/health) in a separate tab. Wait for `{"status":"running"}` to confirm the free-tier service has woken.
- [ ] Keep the health tab open so the backend stays warm during the presentation.

## T-10 Minutes

- [ ] Open [Vercel Home](https://campus-bus-tracking-app-dhsgu-final.vercel.app/home) and [Live Map](https://campus-bus-tracking-app-dhsgu-final.vercel.app/live-map) in separate tabs.
- [ ] Hard-refresh both with `Ctrl+Shift+R` and confirm the home stats, map tiles, route line, and itinerary load.

## T-5 Minutes

- [ ] Open the [Driver Panel](https://campus-bus-tracking-app-dhsgu-final.vercel.app/driver-panel) in a separate tab.
- [ ] Open [Home](https://campus-bus-tracking-app-dhsgu-final.vercel.app/home), expand the chat widget, and keep the health tab open to keep the instance warm.
- [ ] Have the demo PIN `dhsgu2026` ready. Confirm browser location permission or prepare a manual demo coordinate.

## Five-Minute Demo Order

1. **Home stats (0:30):** Show the route, bus, alert and campus overview.
2. **Live Map (1:00):** Trace the blue route and scan the itinerary and distance/ETA card. Remind the audience that the stops are demo data.
3. **Deep-link proof (0:25):** Open `/live-map` directly, press `F5`, and show that the Vercel rewrite loads the single-page route correctly.
4. **Driver Panel (1:15):** Enter the demo PIN, post a location/status update, then return to the map and show the marker move.
5. **AI assistant (0:50):** Ask “Where is the Valley Campus?” and show the assistant's transparent caveat about demo coordinates. If Gemini is unavailable, show the offline response.
6. **Architecture and close (1:00):** Summarize the React/Vercel, Flask/Render, SQLite, OSRM and optional Gemini flow. Close on startup seeding, the route detour guard, and the planned production hardening.

## Fallback Talking Points

- **Cold start:** “The Render free tier can take around 50 seconds to wake; I started it before the demo.” The documented maximum wait is 60 seconds.
- **Offline AI:** “The assistant has an explicit offline fallback, so an unavailable Gemini service does not break the app.”
- **Straight-line route segment:** “Sparse road data can produce an unreasonable detour. We check each OSRM segment and use a direct geographic segment when road geometry is unavailable or fails the detour guard.”
- **Data status:** “Routes, stops, schedules, coordinates and driver records are demonstration data, not official DHSGU operations.”

## Troubleshooting

- **502 from the backend:** Allow up to 60 seconds for the Render free-tier cold start, then refresh `/api/health` and the app tab.
- **Blank or stale frontend:** Check the Vercel deployment status, then hard-refresh with `Ctrl+Shift+R`.
- **Route appears as a straight segment or shows the fallback note:** OSRM may be unreachable or its result may exceed the per-segment detour guard; the direct-line fallback is expected behavior.
- **Driver update does not appear:** Confirm the backend health tab is responding, re-enter the demo PIN, submit the update, then allow one 10-second map refresh cycle.
- **Gemini reply is unavailable:** Present the offline reply as the designed fallback and continue with the map and places views.
