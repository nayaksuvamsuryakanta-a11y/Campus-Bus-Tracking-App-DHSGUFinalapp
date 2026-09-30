from datetime import datetime

from database import get_db_connection, init_db


def seed_database():
    init_db()
    connection = get_db_connection()
    try:
        existing_route = connection.execute(
            "SELECT 1 FROM routes LIMIT 1"
        ).fetchone()
        if existing_route:
            print("Database already seeded")
            return

        routes = [
            (
                "Campus Circle Route",
                "Connects the main campus buildings and central gate.",
                "08:00",
                "18:00",
            ),
            (
                "Hostel Express",
                "Shuttle service between hostels and the university gate.",
                "07:00",
                "22:00",
            ),
            (
                "Academic Block Shuttle",
                "Frequent service between academic buildings.",
                "09:00",
                "17:00",
            ),
        ]
        route_ids = {}
        for route in routes:
            cursor = connection.execute(
                """
                INSERT INTO routes (route_name, description, start_time, end_time)
                VALUES (?, ?, ?, ?)
                """,
                route,
            )
            route_ids[route[0]] = cursor.lastrowid

        stops_by_route = {
            "Campus Circle Route": [
                ("Main Gate", "08:05", "08:06", 23.8398, 78.7561),
                ("Central Library", "08:12", "08:13", 23.8412, 78.7580),
                ("Administrative Block", "08:19", "08:20", 23.8425, 78.7568),
                ("Science Block", "08:27", "08:28", 23.8440, 78.7549),
                ("University Auditorium", "08:34", "08:35", 23.8417, 78.7532),
            ],
            "Hostel Express": [
                ("Boys Hostel", "07:05", "07:06", 23.8461, 78.7590),
                ("Girls Hostel", "07:12", "07:13", 23.8448, 78.7612),
                ("Sports Ground", "07:20", "07:21", 23.8428, 78.7601),
                ("Main Gate", "07:28", "07:29", 23.8398, 78.7561),
                ("Central Library", "07:35", "07:36", 23.8412, 78.7580),
            ],
            "Academic Block Shuttle": [
                ("Main Gate", "09:05", "09:06", 23.8398, 78.7561),
                ("Arts Block", "09:11", "09:12", 23.8408, 78.7542),
                ("Science Block", "09:18", "09:19", 23.8440, 78.7549),
                ("Central Library", "09:25", "09:26", 23.8412, 78.7580),
                ("University Auditorium", "09:32", "09:33", 23.8417, 78.7532),
            ],
        }
        for route_name, stops in stops_by_route.items():
            route_id = route_ids[route_name]
            connection.executemany(
                """
                INSERT INTO stops (
                    route_id, stop_name, arrival_time, departure_time,
                    latitude, longitude
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [(route_id, *stop) for stop in stops],
            )

        connection.executemany(
            """
            INSERT INTO buses (
                bus_number, route_id, driver_name, status, latitude, longitude,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    "BUS-101",
                    route_ids["Campus Circle Route"],
                    "Amit Kumar",
                    "ON_TIME",
                    23.8398,
                    78.7561,
                    datetime.now().isoformat(timespec="seconds"),
                ),
                (
                    "BUS-202",
                    route_ids["Hostel Express"],
                    "Neha Sharma",
                    "IN_TRANSIT",
                    23.8461,
                    78.7590,
                    datetime.now().isoformat(timespec="seconds"),
                ),
                (
                    "BUS-303",
                    route_ids["Academic Block Shuttle"],
                    "Rahul Patel",
                    "ON_TIME",
                    23.8398,
                    78.7561,
                    datetime.now().isoformat(timespec="seconds"),
                ),
            ],
        )

        connection.executemany(
            """
            INSERT INTO alerts (title, message, alert_type, is_active)
            VALUES (?, ?, ?, ?)
            """,
            [
                (
                    "BUS-101 Delayed",
                    "BUS-101 is running 10 minutes behind schedule.",
                    "DELAY",
                    1,
                ),
                (
                    "Hostel Express Route Change",
                    "Hostel Express is using the east entrance today.",
                    "ROUTE_CHANGE",
                    1,
                ),
                (
                    "Campus Service Notice",
                    "Regular shuttle service is operating today.",
                    "GENERAL",
                    0,
                ),
            ],
        )

        connection.commit()
        print("Sample data inserted successfully")
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    seed_database()