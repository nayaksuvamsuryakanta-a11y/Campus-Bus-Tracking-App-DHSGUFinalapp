# Campus Bus Tracking API

**Local base URL:** `http://127.0.0.1:5000`

All responses use JSON. Errors use `{"error":"message"}` with an appropriate HTTP status such as 400 or 404.

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
    "route_name": "Campus Circle Route",
    "description": "Connects the main campus buildings and central gate.",
    "start_time": "08:00",
    "end_time": "18:00"
  }
]
```

## 3. Get Route Details

`GET /api/routes/<route_id>`

Returns one route and its ordered stops. Returns 404 when the route does not exist.

```json
{
  "id": 1,
  "route_name": "Campus Circle Route",
  "description": "Connects the main campus buildings and central gate.",
  "start_time": "08:00",
  "end_time": "18:00",
  "stops": [
    {
      "id": 1,
      "route_id": 1,
      "stop_name": "Main Gate",
      "arrival_time": "08:05",
      "departure_time": "08:06",
      "latitude": 23.8398,
      "longitude": 78.7561
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
    "route_name": "Campus Circle Route",
    "driver_name": "Amit Kumar",
    "status": "ON_TIME",
    "latitude": 23.8398,
    "longitude": 78.7561,
    "updated_at": "2026-09-30T09:00:00"
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
  "route_name": "Campus Circle Route",
  "driver_name": "Amit Kumar",
  "status": "ON_TIME",
  "latitude": 23.8398,
  "longitude": 78.7561,
  "updated_at": "2026-09-30T09:00:00"
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
    "title": "BUS-101 Delayed",
    "message": "BUS-101 is running 10 minutes behind schedule.",
    "alert_type": "DELAY",
    "is_active": 1,
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