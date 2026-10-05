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