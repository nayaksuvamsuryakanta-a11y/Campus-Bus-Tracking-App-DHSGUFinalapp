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
            ("Jawaharlal Nehru Central Library", "08:05", "08:06", 23.8276, 78.7708),
            ("Rani Laxmi Bai Girls Hostel", "08:12", "08:13", 23.8306, 78.7817),
            ("Jawaharlal Nehru Central Library", "08:19", "08:20", 23.8276, 78.7708),
            ("Vivekanand Boys Hostel", "08:27", "08:28", 23.8239, 78.7700),
            ("Jawaharlal Nehru Central Library", "08:34", "08:35", 23.8276, 78.7708),
            ("Valley Campus", "08:42", "08:43", 23.8241, 78.7816),
            ("Department of Computer Science and Applications", "08:50", "08:51", 23.8241, 78.7820),
            ("Jawaharlal Nehru Central Library", "08:58", "08:59", 23.8276, 78.7708),
        ],
        "bus_number": "BUS-101",
        "driver_name": "Demo driver BUS-101 (not official)",
        "status": "ON_TIME",
    },
]

PLACES = [
    ("Jawaharlal Nehru Central Library", "LIBRARY", "DEMO campus place; not official transit data.", 23.8276, 78.7708),
    ("Rani Laxmi Bai Girls Hostel", "HOSTEL", "DEMO campus place; not official transit data.", 23.8306, 78.7817),
    ("Vivekanand Boys Hostel", "HOSTEL", "DEMO campus place; not official transit data.", 23.8239, 78.7700),
    ("Valley Campus", "OTHER", "DEMO campus place; not official transit data.", 23.8241, 78.7816),
    ("Department of Computer Science and Applications", "ACADEMIC", "DEMO campus place; not official transit data.", 23.8241, 78.7820),
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