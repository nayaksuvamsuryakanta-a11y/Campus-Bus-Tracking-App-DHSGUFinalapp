# Hackathon Demo Script

**Target duration: 9 minutes**

## 1. Introduction and Problem (1 minute)

- Introduce Campus Bus Tracking App and the CodeCraft Mobile App Development Challenge.
- Explain the problem: students need reliable route, arrival, bus-location, and service-change information.
- State the three goals: make schedules visible, demonstrate live location tracking, and communicate disruptions.

## 2. Student Experience (2 minutes)

- Open the Home dashboard and point out route, bus, active-alert, and delayed-bus counts.
- Open Routes and select a route such as Campus Circle Route.
- Show stop names with arrival/departure times and the route's service hours.
- Open Live Map and point out the bus markers, route/status popups, and 10-second refresh indicator.

## 3. Driver Experience (2 minutes)

- Open Driver Panel and select BUS-101.
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
- Show that Flask reads/writes SQLite through a shared connection helper and returns JSON.
- Mention Leaflet with OpenStreetMap tiles, browser/manual GPS options, and periodic location polling.
- Note that demonstration data is seeded locally and no paid API is required.

## 6. Conclusion and Future Scope (1 minute)

- Recap how students see schedules, bus positions, and alerts while drivers can publish updates.
- Acknowledge that sample coordinates demonstrate the flow and are not an installed GPS device feed.
- Mention future work: secure driver authentication, push notifications, production persistence, and a React Native client.