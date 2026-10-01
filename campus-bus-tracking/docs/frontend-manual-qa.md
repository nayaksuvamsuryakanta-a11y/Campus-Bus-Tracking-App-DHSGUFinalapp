# Frontend Manual QA

## Not testable in jsdom

- Real OpenStreetMap tile loading, network availability, attribution rendering, and map panning/zooming.
- Real GPS hardware, browser permission prompts, and device coordinate accuracy.
- Visual Leaflet marker appearance and placement on the rendered map; automated tests verify marker props and status-derived icon HTML only.
- Real network latency, intermittent connectivity, request cancellation, and behavior under slow or out-of-order API responses.

## Manual checklist

1. Start the backend and frontend, open the app in a desktop browser, and verify the map tiles load with attribution and the map remains interactive while zooming and panning.
2. Inspect each bus marker on the map: confirm its location matches returned coordinates and the icon color reflects ON_TIME, DELAYED, IN_TRANSIT, and OFFLINE status.
3. Open Driver Panel on a GPS-capable device, grant location permission, select **Use My Current Location**, and compare the displayed coordinates with the browser/device location. Repeat after denying permission and confirm the manual-coordinate guidance appears.
4. Use browser developer tools to throttle the network and then toggle offline mode. Confirm loading indicators, page-level errors, chat fallback, and retry behavior remain understandable and the layout does not break.
5. With throttling enabled, submit driver location, status, and alert updates. Verify submit controls stay disabled while each request is pending, feedback appears after completion, and the UI does not duplicate writes.
6. Open the app on a narrow mobile viewport and confirm the map controls, navigation, assistant panel, route tables, and driver forms remain usable without overlapping content.
