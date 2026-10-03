import hmac
import json
import math
import os
from datetime import datetime, timezone

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


def _build_chat_context():
    connection = get_db_connection()
    try:
        university_info = connection.execute(
            "SELECT key, value FROM university_info ORDER BY key"
        ).fetchall()
        verified_places = connection.execute(
            """SELECT name, category, description, latitude, longitude, notes
               FROM campus_places WHERE is_verified = 1 ORDER BY category, name"""
        ).fetchall()
        demo_place_names = connection.execute(
            """SELECT name, category, description, notes
               FROM campus_places WHERE is_verified = 0 ORDER BY category, name"""
        ).fetchall()
        active_alerts = connection.execute(
            """SELECT title, message, alert_type, is_demo, created_at
               FROM alerts WHERE is_active = 1 ORDER BY created_at DESC, id DESC"""
        ).fetchall()
        bus_statuses = connection.execute(
            """SELECT b.bus_number, b.status, b.is_verified, r.route_name
               FROM buses AS b LEFT JOIN routes AS r ON r.id = b.route_id
               ORDER BY b.id"""
        ).fetchall()
        routes = connection.execute(
            """SELECT route_name, start_time, end_time, is_verified
               FROM routes ORDER BY id"""
        ).fetchall()
        return {
            "university_info": [dict(row) for row in university_info],
            "verified_places": [dict(row) for row in verified_places],
            "demo_place_names_only": [dict(row) for row in demo_place_names],
            "active_alerts": [dict(row) for row in active_alerts],
            "bus_statuses": [dict(row) for row in bus_statuses],
            "route_summary": [dict(row) for row in routes],
        }
    finally:
        connection.close()


def _offline_chat_reply(message):
    normalized = message.casefold()
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

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"reply": _offline_chat_reply(message)})

    try:
        context = _build_chat_context()
        system_instruction = (
            "You are the DHSGU Transit & Safety Assistant. Be polite, concise, "
            "and helpful to students and faculty. Answer DHSGU factual questions "
            "strictly from the supplied database context. Do not invent routes, "
            "timetables, bus locations, driver names, contacts, or emergency "
            "numbers. Routes marked is_verified=0 and alerts marked is_demo=1 "
            "are demonstration data, not official DHSGU information. Only present "
            "a place as officially verified if it appears in verified_places. "
            "demo_place_names_only contains names without verified coordinates: "
            "you may identify a listed name, but state its location is unverified "
            "and direct the user to Places; never use those rows for directions. "
            "For real-time bus locations, direct the user to the Live Map page. "
            "If asked for an emergency number or unverified directions, say the "
            "information is not available and suggest contacting the university "
            "Security Department or local emergency services without guessing a number. "
            "If the context does not contain an answer, say you cannot verify it.\n\n"
            "Current database context (JSON):\n"
            f"{json.dumps(context, ensure_ascii=False, default=str)}"
        )

        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_instruction,
        )
        response = model.generate_content(message, request_options={"timeout": 30})
        reply = getattr(response, "text", "")
        if not isinstance(reply, str) or not reply.strip():
            raise ValueError("Gemini returned an empty response")
        return jsonify({"reply": reply.strip()})
    except Exception:
        current_app.logger.exception("Gemini chat request failed")
        return jsonify({"reply": _offline_chat_reply(message)})


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