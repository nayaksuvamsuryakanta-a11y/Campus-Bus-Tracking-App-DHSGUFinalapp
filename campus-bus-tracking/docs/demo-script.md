# Hackathon Demo Script

**Target duration: 10 minutes**

## 1. Introduction and Problem (1 minute)

- Introduce the DHSGU Bus Tracker and the CodeCraft Mobile App Development Challenge.
- Explain the problem: students need reliable route, arrival, bus-location, and service-change information.
- State the three goals: make schedules visible, demonstrate live location tracking, and communicate disruptions.
- Clarify that DHSGU facts/place names are verified, while routes, schedules, and coordinates are visibly labeled demo data.

## 2. Student Experience (2 minutes)

- Open the Home dashboard and point out route, bus, active-alert, and delayed-bus counts.
- Open About DHSGU to show the founding, address, and transport distances; then browse Places by category.
- Open Routes and select a clearly labeled demo route.
- Show stop names with arrival/departure times and the route's service hours.
- Open Live Map and point out bus/status markers, stop/place toggles, the place fly-to link, and 10-second bus refresh.

## 3. Driver Experience (2 minutes)

- Select Driver in the user-type menu and open Driver Panel. Enter the configured demo PIN, or continue with a blank PIN in local development when PIN protection is unset.
- Select BUS-101; point out its demo-data badge.
- Use “Use My Current Location” if browser permission is available; otherwise enter the demonstration coordinates manually.
- Update the location and show the success feedback.
- Change the status to `DELAYED` and show the updated bus details.
- Return to Live Map and show the marker popup reflecting the bus update.

## 4. Alert System (1.5 minutes)

- In Driver Panel, create a `DELAY` alert with a clear title and message; leave “Is Active” checked.
- Broadcast it and show the success confirmation.
- Open Alerts to show the new active alert at the top.
- Return Home to show the active alert banner and updated active-alert count.

## 5. Technical Overview (1.5 minutes)

- Explain that React pages use shared components and Axios service modules to call the Flask REST API.
- Show that Flask reads/writes SQLite through a shared connection helper and returns JSON, including the university/place endpoints.
- Mention Leaflet with OpenStreetMap tiles, browser/manual GPS options, and periodic location polling.
- Note that the optional `DRIVER_PIN` is only a demo safeguard, and no paid API is required.

## 6. AI Assistant (1 minute)

- Open the floating DHSGU Transit & Safety Assistant.
- Ask: “Are there any bus delays today?” and point out that it uses active alert context.
- Ask: “Where is the Swarna Jayanti Auditorium?” and explain that it must not invent directions while the place coordinates remain unverified.
- If no `GEMINI_API_KEY` is configured or the service is offline, show the offline demo response and use the Alerts/Places pages for current app data.

## 7. Conclusion and Future Scope (1 minute)

- Recap how students see schedules, bus positions, and alerts while drivers can publish updates.
- Acknowledge that sample routes/times and approximate map pins demonstrate the flow and are not official schedules or an installed GPS device feed. Replace the map center and coordinates using OpenStreetMap and on-site confirmation.
- Mention future work: secure driver authentication, push notifications, production persistence, and a React Native client.