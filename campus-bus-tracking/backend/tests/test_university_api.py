import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from flask import Flask

import database
from routes import api
from seed import seed_database


class UniversityPlaceApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.database_path_patcher = patch.object(
            database, "DATABASE_PATH", Path(self.temp_dir.name) / "api-test.db"
        )
        self.database_path_patcher.start()
        database.init_db()

        connection = database.get_db_connection()
        connection.executemany(
            "INSERT INTO university_info (key, value) VALUES (?, ?)",
            [
                ("name_english", "Dr. Harisingh Gour Vishwavidyalaya"),
                ("short_name", "DHSGU"),
            ],
        )
        connection.executemany(
            """INSERT INTO campus_places
               (name, category, description, latitude, longitude, is_verified, notes)
               VALUES (?, ?, ?, ?, ?, 0, ?)""",
            [
                ("Central Library", "LIBRARY", "Demo location", 23.84, 78.75, "coordinates to be confirmed on site"),
                ("Nivedita Girls Hostel", "HOSTEL", "Demo location", 23.841, 78.751, "coordinates to be confirmed on site"),
            ],
        )
        connection.commit()
        connection.close()

        self.app = Flask(__name__)
        self.app.register_blueprint(api, url_prefix="/api")
        self.client = self.app.test_client()

    def tearDown(self):
        self.database_path_patcher.stop()
        self.temp_dir.cleanup()

    def test_get_university_returns_info_as_object(self):
        response = self.client.get("/api/university")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["short_name"], "DHSGU")
        self.assertEqual(
            response.get_json()["name_english"],
            "Dr. Harisingh Gour Vishwavidyalaya",
        )

    def test_get_places_returns_unverified_place_records(self):
        response = self.client.get("/api/places")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.get_json()), 2)
        self.assertEqual(response.get_json()[0]["is_verified"], 0)

    def test_places_category_filter_and_validation(self):
        filtered = self.client.get("/api/places?category=LIBRARY")
        invalid = self.client.get("/api/places?category=NOT_A_CATEGORY")

        self.assertEqual(filtered.status_code, 200)
        self.assertEqual([place["name"] for place in filtered.get_json()], ["Central Library"])
        self.assertEqual(invalid.status_code, 400)
        self.assertIn("error", invalid.get_json())

    def test_get_place_and_missing_place(self):
        places = self.client.get("/api/places").get_json()
        found = self.client.get(f"/api/places/{places[0]['id']}")
        missing = self.client.get("/api/places/9999")

        self.assertEqual(found.status_code, 200)
        self.assertEqual(found.get_json()["name"], places[0]["name"])
        self.assertEqual(missing.status_code, 404)

    def test_legacy_schema_migration_preserves_rows(self):
        legacy_path = Path(self.temp_dir.name) / "legacy.db"
        legacy = sqlite3.connect(legacy_path)
        legacy.executescript(
            """
            CREATE TABLE routes (id INTEGER PRIMARY KEY, route_name TEXT NOT NULL, description TEXT, start_time TEXT NOT NULL, end_time TEXT NOT NULL);
            CREATE TABLE stops (id INTEGER PRIMARY KEY, route_id INTEGER NOT NULL, stop_name TEXT NOT NULL, arrival_time TEXT, departure_time TEXT, latitude REAL, longitude REAL);
            CREATE TABLE buses (id INTEGER PRIMARY KEY, bus_number TEXT NOT NULL, route_id INTEGER, driver_name TEXT, status TEXT DEFAULT 'OFFLINE', latitude REAL, longitude REAL, updated_at TEXT);
            CREATE TABLE alerts (id INTEGER PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL, alert_type TEXT DEFAULT 'GENERAL', is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
            INSERT INTO routes VALUES (1, 'Legacy route', 'preserve this row', '08:00', '09:00');
            """
        )
        legacy.commit()
        legacy.close()

        self.database_path_patcher.stop()
        self.database_path_patcher = patch.object(database, "DATABASE_PATH", legacy_path)
        self.database_path_patcher.start()
        database.init_db()
        connection = database.get_db_connection()
        try:
            route = connection.execute("SELECT * FROM routes WHERE id = 1").fetchone()
            self.assertEqual(route["description"], "preserve this row")
            self.assertEqual(route["is_verified"], 0)
            tables = {
                row["name"]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = ?", ("table",)
                )
            }
            self.assertTrue({"campus_places", "university_info"}.issubset(tables))
        finally:
            connection.close()

    def test_driver_pin_required_only_when_configured(self):
        connection = database.get_db_connection()
        cursor = connection.execute(
            "INSERT INTO routes (route_name, start_time, end_time) VALUES (?, ?, ?)",
            ("Test route", "08:00", "09:00"),
        )
        bus_cursor = connection.execute(
            "INSERT INTO buses (bus_number, route_id) VALUES (?, ?)",
            ("TEST-BUS", cursor.lastrowid),
        )
        alert_cursor = connection.execute(
            """INSERT INTO alerts (title, message, alert_type)
               VALUES (?, ?, ?)""",
            ("Test alert", "PIN test", "GENERAL"),
        )
        connection.commit()
        connection.close()
        bus_id = bus_cursor.lastrowid
        alert_id = alert_cursor.lastrowid
        location_body = {"latitude": 23.84, "longitude": 78.75}
        alert_body = {
            "title": "New test alert",
            "message": "PIN test",
            "alert_type": "GENERAL",
            "is_active": True,
        }

        with patch.dict(os.environ, {"DRIVER_PIN": "test-pin"}):
            denied_responses = [
                self.client.post(f"/api/buses/{bus_id}/location", json=location_body),
                self.client.post(f"/api/buses/{bus_id}/status", json={"status": "DELAYED"}),
                self.client.post("/api/alerts", json=alert_body),
                self.client.patch(f"/api/alerts/{alert_id}", json={"is_active": False}),
            ]
            pin_header = {"X-Driver-Pin": "test-pin"}
            accepted_responses = [
                self.client.post(
                    f"/api/buses/{bus_id}/location", json=location_body, headers=pin_header
                ),
                self.client.post(
                    f"/api/buses/{bus_id}/status",
                    json={"status": "DELAYED"},
                    headers=pin_header,
                ),
                self.client.post("/api/alerts", json=alert_body, headers=pin_header),
                self.client.patch(
                    f"/api/alerts/{alert_id}",
                    json={"is_active": False},
                    headers=pin_header,
                ),
            ]

        self.assertEqual([response.status_code for response in denied_responses], [401] * 4)
        self.assertEqual([response.status_code for response in accepted_responses], [200, 200, 201, 200])

    def test_seed_is_idempotent_and_reset_preserves_verified_rows(self):
        connection = database.get_db_connection()
        verified_route = connection.execute(
            """INSERT INTO routes (route_name, start_time, end_time, is_verified)
               VALUES (?, ?, ?, 1)""",
            ("Confirmed university route", "08:00", "09:00"),
        )
        verified_route_id = verified_route.lastrowid
        connection.execute(
            """INSERT INTO campus_places (name, category, is_verified)
               VALUES (?, ?, 1)""",
            ("Verified place", "OTHER"),
        )
        connection.execute(
            """INSERT INTO alerts (title, message, alert_type, is_active)
               VALUES (?, ?, ?, 1)""",
            ("User alert", "Keep this alert", "GENERAL"),
        )
        connection.commit()
        connection.close()

        seed_database()
        seed_database()
        connection = database.get_db_connection()
        try:
            before_reset = {
                table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                for table in ("routes", "stops", "buses", "alerts", "campus_places")
            }
        finally:
            connection.close()

        seed_database(reset=True)
        connection = database.get_db_connection()
        try:
            after_reset = {
                table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                for table in ("routes", "stops", "buses", "alerts", "campus_places")
            }
            self.assertEqual(after_reset["routes"], 4)
            self.assertEqual(after_reset["stops"], 15)
            self.assertEqual(after_reset["buses"], 3)
            self.assertEqual(after_reset["alerts"], 4)
            self.assertEqual(after_reset["campus_places"], 21)
            self.assertEqual(
                connection.execute(
                    "SELECT is_verified FROM routes WHERE id = ?", (verified_route_id,)
                ).fetchone()["is_verified"],
                1,
            )
            self.assertEqual(
                connection.execute("SELECT COUNT(*) FROM alerts WHERE title = ?", ("User alert",)).fetchone()[0],
                1,
            )
            self.assertEqual(before_reset, after_reset)
        finally:
            connection.close()


if __name__ == "__main__":
    unittest.main()