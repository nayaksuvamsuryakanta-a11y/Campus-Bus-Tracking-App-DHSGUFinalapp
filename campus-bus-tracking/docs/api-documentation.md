# Campus Bus Tracking API

**Local base URL:** `http://127.0.0.1:5000`

All responses use JSON. Errors use `{"error":"message"}` with an appropriate HTTP status such as 400 or 404.

The `routes`, `stops`, and `buses` responses include `is_verified` (`0` for current demo data). Alert rows include `is_demo`. Coordinates and schedules in seeded rows are not official DHSGU data.

When backend environment variable `DRIVER_PIN` is set, all write endpoints require `X-Driver-Pin: <configured value>` and return HTTP 401 otherwise. When unset, write endpoints remain open for local demo development. This is not real authentication.

## 1. Health Check

`GET /api/health`

Returns service availability.

```json
{
  "status": "running",
  "service": "Campus Bus Tracking API"
}
```

## 2. List Routes

`GET /api/routes`

Returns all routes.

```json
[
  {
    "id": 1,
    "route_name": "Campus Circle Route (DEMO)",
    "description": "DEMO route; stops and timings are not official.",
    "start_time": "08:00",
    "end_time": "18:00",
    "is_verified": 0
  }
]
```

## 3. Get Route Details

`GET /api/routes/<route_id>`

Returns one route and its ordered stops. Returns 404 when the route does not exist.

```json
{
  "id": 1,
  "route_name": "Campus Circle Route (DEMO)",
  "description": "DEMO route; stops and timings are not official.",
  "start_time": "08:00",
  "end_time": "18:00",
  "is_verified": 0,
  "stops": [
    {
      "id": 1,
      "route_id": 1,
      "stop_name": "Campus Residences",
      "arrival_time": "08:05",
      "departure_time": "08:06",
      "latitude": 23.8398,
      "longitude": 78.75,
      "is_verified": 0
    }
  ]
}
```

## 4. List Buses

`GET /api/buses`

Returns buses with their route names and current coordinates.

```json
[
  {
    "id": 1,
    "bus_number": "BUS-101",
    "route_id": 1,
    "route_name": "Campus Circle Route (DEMO)",
    "driver_name": "Demo driver BUS-101 (not official)",
    "status": "ON_TIME",
    "latitude": 23.8398,
    "longitude": 78.7561,
    "updated_at": "2026-09-30T09:00:00",
    "is_verified": 0
  }
]
```

## 5. Get Bus

`GET /api/buses/<bus_id>`

Returns one bus with route name and current location. Returns 404 when the bus does not exist.

```json
{
  "id": 1,
  "bus_number": "BUS-101",
  "route_id": 1,
  "route_name": "Campus Circle Route (DEMO)",
  "driver_name": "Demo driver BUS-101 (not official)",
  "status": "ON_TIME",
  "latitude": 23.8398,
  "longitude": 78.7561,
  "updated_at": "2026-09-30T09:00:00",
  "is_verified": 0
}
```

## 6. Update Bus Location

`POST /api/buses/<bus_id>/location`

Updates coordinates and the ISO timestamp. Latitude must be between -90 and 90; longitude must be between -180 and 180. Returns 400 for invalid JSON/coordinates and 404 for an unknown bus.

Request:

```json
{
  "latitude": 23.84,
  "longitude": 78.75
}
```

Success:

```json
{
  "message": "Bus location updated successfully",
  "bus_id": 1,
  "latitude": 23.84,
  "longitude": 78.75,
  "updated_at": "2026-09-30T09:05:00"
}
```

## 7. Update Bus Status

`POST /api/buses/<bus_id>/status`

Valid statuses are `ON_TIME`, `DELAYED`, `IN_TRANSIT`, and `OFFLINE`. Returns 400 for an invalid status and 404 for an unknown bus.

Request:

```json
{
  "status": "DELAYED"
}
```

Success:

```json
{
  "message": "Bus status updated successfully",
  "bus_id": 1,
  "status": "DELAYED"
}
```

## 8. List Alerts

`GET /api/alerts`

Returns alerts ordered newest first.

```json
[
  {
    "id": 1,
    "title": "(DEMO) BUS-101 Delayed",
    "message": "DEMO alert: BUS-101 is running 10 minutes behind schedule.",
    "alert_type": "DELAY",
    "is_active": 1,
    "is_demo": 1,
    "created_at": "2026-09-30 09:00:00"
  }
]
```

## 9. Create Alert

`POST /api/alerts`

Required fields are non-empty `title` and `message`, `alert_type` (`DELAY`, `ROUTE_CHANGE`, `CANCELLATION`, or `GENERAL`), and `is_active` (`true`, `false`, `1`, or `0`). Returns 400 for invalid input.

Request:

```json
{
  "title": "Route change",
  "message": "The shuttle will use the east entrance today.",
  "alert_type": "ROUTE_CHANGE",
  "is_active": true
}
```

Success (HTTP 201):

```json
{
  "message": "Alert created successfully",
  "alert_id": 4
}
```

## 10. Update Alert Active State

`PATCH /api/alerts/<alert_id>`

Sets the alert's `is_active` value to a boolean or integer 0/1. Returns 400 for invalid input and 404 for an unknown alert.

Request:

```json
{
  "is_active": false
}
```

Success:

```json
{
  "message": "Alert updated successfully",
  "alert_id": 4,
  "is_active": false
}
```

## 11. Get University Information

`GET /api/university`

Returns verified DHSGU information as a JSON object keyed by fact name. Contact fields intentionally contain confirmation instructions rather than invented contact details.

```json
{
  "name_english": "Dr. Harisingh Gour Vishwavidyalaya",
  "name_hindi": "डॉ. हरीसिंह गौर विश्वविद्यालय",
  "short_name": "DHSGU",
  "also_known_as": "Sagar University",
  "former_name": "University of Saugar",
  "founded": "18 July 1946",
  "central_university_since": "15 January 2009",
  "address": "University Road, Sagar, Madhya Pradesh 470003",
  "website": "https://www.dhsgsu.edu.in",
  "distance_sagar_bus_stand": "About 3 km; about 10 minutes by road.",
  "distance_saugor_railway_station": "About 4-5 km; sources differ.",
  "distance_dhana_airport": "About 13 km."
}
```

## 12. List Campus Places

`GET /api/places` or `GET /api/places?category=HOSTEL`

Returns campus places. The optional category must be one of `GATE`, `HOSTEL`, `ACADEMIC`, `LIBRARY`, `AUDITORIUM`, `HEALTH`, `BANK`, `CANTEEN`, `SPORTS`, `GARDEN`, `MUSEUM`, `SCHOOL`, `SECURITY`, or `OTHER`. Invalid categories return HTTP 400. Demo locations have `is_verified: 0` and notes that coordinates must be confirmed on site.

```json
[
  {
    "id": 1,
    "name": "Central Library",
    "category": "LIBRARY",
    "description": "Officially named facility; coordinates are unverified.",
    "latitude": 23.8407,
    "longitude": 78.7504,
    "is_verified": 0,
    "notes": "coordinates to be confirmed on site"
  }
]
```

## 13. Get Campus Place

`GET /api/places/<place_id>`

Returns one campus place in the same shape as the list endpoint. Returns HTTP 404 when the ID does not exist.

```json
{
  "id": 1,
  "name": "Central Library",
  "category": "LIBRARY",
  "description": "Officially named facility; coordinates are unverified.",
  "latitude": 23.8407,
  "longitude": 78.7504,
  "is_verified": 0,
  "notes": "coordinates to be confirmed on site"
}
```

## 14. Ask the Transit and Safety Assistant

`POST /api/chat`

Accepts one question and returns a concise answer using database context for verified university information/places, active alerts, and a route summary. Routes marked as demo are not official, and the assistant must not invent bus timings or emergency numbers. For live bus locations it directs the user to the Live Map. If `GEMINI_API_KEY` is unset or the Gemini request fails, it returns an offline demo reply instead. The key belongs in the backend environment only.

Request:

```json
{
  "message": "Are there any bus delays today?"
}
```

Gemini success:

```json
{
  "reply": "The active alerts currently list a demo delay for BUS-101. This is demonstration data, not an official DHSGU bus update."
}
```

Offline success:

```json
{
  "reply": "I am currently in offline demo mode. Please check the Alerts page for live updates."
}
```

An absent/blank message, non-JSON body, or message over 2000 characters returns HTTP 400 with the standard error format.