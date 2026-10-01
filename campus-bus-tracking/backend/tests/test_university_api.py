import os
import sqlite3
import sys
import unittest
import uuid
from datetime import datetime, timezone
from types import ModuleType, SimpleNamespace
from unittest.mock import Mock, patch

from flask import Flask

import database
import seed
from routes import api
from seed import seed_database


class UniversityPlaceApiTests(unittest.TestCase):
    def setUp(self):
        self.environment_snapshot = {
            key: os.environ.get(key) for key in ("DRIVER_PIN", "GEMINI_API_KEY")
        }
        self.database_uri = self._new_database_uri()
        self.keeper_connection = self._connect_test_database()
        self.database_connection_patchers = [
            patch.object(database, "get_db_connection", side_effect=self._connect_test_database),
            patch("routes.get_db_connection", side_effect=self._connect_test_database),
            patch("seed.get_db_connection", side_effect=self._connect_test_database),
        ]
        for patcher in self.database_connection_patchers:
            patcher.start()
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
        for patcher in reversed(self.database_connection_patchers):
            patcher.stop()
        self.keeper_connection.close()
        for key, value in self.environment_snapshot.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    @staticmethod
    def _new_database_uri():
        return f"file:campus_bus_test_{uuid.uuid4().hex}?mode=memory&cache=shared"

    def _connect_test_database(self):
        connection = sqlite3.connect(self.database_uri, uri=True)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

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

    def test_core_list_endpoints_return_seeded_records(self):
        connection = database.get_db_connection()
        route_cursor = connection.execute(
            """INSERT INTO routes (route_name, start_time, end_time, is_verified)
               VALUES (?, ?, ?, 1)""",
            ("Verified campus loop", "08:00", "18:00"),
        )
        connection.execute(
            """INSERT INTO buses (bus_number, route_id, status, is_verified)
               VALUES (?, ?, ?, 1)""",
            ("DHSGU-TEST-1", route_cursor.lastrowid, "ON_TIME"),
        )
        connection.execute(
            """INSERT INTO alerts (title, message, alert_type, is_active)
               VALUES (?, ?, ?, 1)""",
            ("Test service notice", "Service is operating normally.", "GENERAL"),
        )
        connection.commit()
        connection.close()

        routes = self.client.get("/api/routes")
        buses = self.client.get("/api/buses")
        alerts = self.client.get("/api/alerts")
        university = self.client.get("/api/university")
        places = self.client.get("/api/places")

        for response in (routes, buses, alerts, places):
            self.assertEqual(response.status_code, 200)
            self.assertIsInstance(response.get_json(), list)
        self.assertEqual(university.status_code, 200)
        self.assertIsInstance(university.get_json(), dict)
        self.assertEqual(routes.get_json()[0]["route_name"], "Verified campus loop")
        self.assertEqual(buses.get_json()[0]["bus_number"], "DHSGU-TEST-1")
        self.assertEqual(alerts.get_json()[0]["title"], "Test service notice")

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
        legacy_uri = self._new_database_uri()
        legacy = sqlite3.connect(legacy_uri, uri=True)
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

        self.keeper_connection.close()
        self.database_uri = legacy_uri
        legacy.row_factory = sqlite3.Row
        legacy.execute("PRAGMA foreign_keys = ON")
        self.keeper_connection = legacy
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

    def test_init_db_is_safe_when_called_repeatedly(self):
        database.init_db()
        database.init_db()

        connection = database.get_db_connection()
        try:
            for table, expected_column in (
                ("routes", "is_verified"),
                ("stops", "is_verified"),
                ("buses", "is_verified"),
                ("alerts", "is_demo"),
            ):
                columns = {
                    row["name"]
                    for row in connection.execute(f"PRAGMA table_info({table})")
                }
                self.assertIn(expected_column, columns)
        finally:
            connection.close()

    def test_write_endpoints_reject_invalid_coordinates_and_enum_values(self):
        connection = database.get_db_connection()
        route_cursor = connection.execute(
            "INSERT INTO routes (route_name, start_time, end_time) VALUES (?, ?, ?)",
            ("Validation route", "08:00", "09:00"),
        )
        bus_cursor = connection.execute(
            "INSERT INTO buses (bus_number, route_id) VALUES (?, ?)",
            ("VALIDATION-BUS", route_cursor.lastrowid),
        )
        connection.commit()
        connection.close()

        headers = {"X-Driver-Pin": "validation-pin"}
        with patch.dict(os.environ, {"DRIVER_PIN": "validation-pin"}):
            invalid_latitude = self.client.post(
                f"/api/buses/{bus_cursor.lastrowid}/location",
                json={"latitude": 91, "longitude": 78.75},
                headers=headers,
            )
            invalid_longitude = self.client.post(
                f"/api/buses/{bus_cursor.lastrowid}/location",
                json={"latitude": 23.84, "longitude": -181},
                headers=headers,
            )
            invalid_status = self.client.post(
                f"/api/buses/{bus_cursor.lastrowid}/status",
                json={"status": "LATE"},
                headers=headers,
            )
            invalid_alert_type = self.client.post(
                "/api/alerts",
                json={
                    "title": "Invalid enum",
                    "message": "Should be rejected",
                    "alert_type": "WEATHER",
                    "is_active": True,
                },
                headers=headers,
            )

        self.assertEqual(
            [
                invalid_latitude.status_code,
                invalid_longitude.status_code,
                invalid_status.status_code,
                invalid_alert_type.status_code,
            ],
            [400, 400, 400, 400],
        )

    def test_driver_pin_is_required_when_configured(self):
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

    def test_unset_driver_pin_uses_demo_default(self):
        connection = database.get_db_connection()
        cursor = connection.execute(
            "INSERT INTO buses (bus_number) VALUES (?)", ("DEFAULT-PIN-TEST-BUS",)
        )
        connection.commit()
        bus_id = cursor.lastrowid
        connection.close()

        with patch.dict(os.environ):
            os.environ.pop("DRIVER_PIN", None)
            denied = self.client.post(
                f"/api/buses/{bus_id}/location",
                json={"latitude": 23.84, "longitude": 78.75},
            )
            accepted = self.client.post(
                f"/api/buses/{bus_id}/location",
                json={"latitude": 23.84, "longitude": 78.75},
                headers={"X-Driver-Pin": "dhsgu2026"},
            )

        self.assertEqual(denied.status_code, 401)
        self.assertEqual(accepted.status_code, 200)

    def test_blank_driver_pin_disables_optional_pin_check(self):
        connection = database.get_db_connection()
        cursor = connection.execute(
            "INSERT INTO buses (bus_number) VALUES (?)", ("PIN-TEST-BUS",)
        )
        connection.commit()
        bus_id = cursor.lastrowid
        connection.close()

        with patch.dict(os.environ, {"DRIVER_PIN": ""}):
            response = self.client.post(
                f"/api/buses/{bus_id}/location",
                json={"latitude": 23.84, "longitude": 78.75},
            )

        self.assertEqual(response.status_code, 200)

    def test_location_timestamp_is_utc_sqlite_format(self):
        connection = database.get_db_connection()
        cursor = connection.execute(
            "INSERT INTO buses (bus_number) VALUES (?)", ("UTC-TEST-BUS",)
        )
        connection.commit()
        bus_id = cursor.lastrowid
        connection.close()

        with patch.dict(os.environ, {"DRIVER_PIN": ""}):
            response = self.client.post(
                f"/api/buses/{bus_id}/location",
                json={"latitude": 23.84, "longitude": 78.75},
            )

        self.assertEqual(response.status_code, 200)
        timestamp = response.get_json()["updated_at"]
        parsed_timestamp = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S")
        utc_now = datetime.now(timezone.utc).replace(tzinfo=None)
        self.assertLess(abs((utc_now - parsed_timestamp).total_seconds()), 10)

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
                connection.execute(
                    "SELECT COUNT(*) FROM alerts WHERE title = ?", ("User alert",)
                ).fetchone()[0],
                1,
            )
            self.assertEqual(before_reset, after_reset)
        finally:
            connection.close()

    def test_chat_offline_fallback_and_message_validation(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
            response = self.client.post(
                "/api/chat", json={"message": "Are there any bus delays today?"}
            )
            missing = self.client.post("/api/chat", json={})
            blank = self.client.post("/api/chat", json={"message": " "})
            too_long = self.client.post("/api/chat", json={"message": "x" * 2001})

        self.assertEqual(response.status_code, 200)
        self.assertIn("offline demo mode", response.get_json()["reply"])
        self.assertEqual(missing.status_code, 400)
        self.assertEqual(blank.status_code, 400)
        self.assertEqual(too_long.status_code, 400)

    def test_chat_sends_rag_context_to_gemini(self):
        connection = database.get_db_connection()
        connection.execute(
            """INSERT INTO campus_places
               (name, category, description, is_verified)
               VALUES (?, ?, ?, 1)""",
            ("Verified Auditorium", "AUDITORIUM", "Verified place description"),
        )
        connection.execute(
            """INSERT INTO routes (route_name, start_time, end_time, is_verified)
               VALUES (?, ?, ?, 0)""",
            ("Test route (DEMO)", "08:00", "09:00"),
        )
        connection.execute(
            """INSERT INTO alerts (title, message, alert_type, is_active, is_demo)
               VALUES (?, ?, ?, 1, 1)""",
            ("Active demo delay", "A sample bus is delayed", "DELAY"),
        )
        connection.commit()
        connection.close()

        model = Mock()
        model.generate_content.return_value = SimpleNamespace(text="Context-grounded answer")
        generative_ai = ModuleType("google.generativeai")
        generative_ai.configure = Mock()
        generative_ai.GenerativeModel = Mock(return_value=model)
        google_package = ModuleType("google")
        google_package.__path__ = []
        google_package.generativeai = generative_ai

        with (
            patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}),
            patch.dict(
                sys.modules,
                {"google": google_package, "google.generativeai": generative_ai},
            ),
        ):
            response = self.client.post(
                "/api/chat", json={"message": "Where is the auditorium?"}
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"reply": "Context-grounded answer"})
        system_instruction = generative_ai.GenerativeModel.call_args.kwargs[
            "system_instruction"
        ]
        self.assertIn("Verified Auditorium", system_instruction)
        self.assertIn("Active demo delay", system_instruction)
        self.assertIn("Test route (DEMO)", system_instruction)
        self.assertIn("Nivedita Girls Hostel", system_instruction)
        self.assertIn("demo_place_names_only", system_instruction)

    def test_chat_falls_back_when_gemini_import_is_missing(self):
        with (
            patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}),
            patch.dict(sys.modules, {"google": None, "google.generativeai": None}),
        ):
            response = self.client.post("/api/chat", json={"message": "Hello"})

        self.assertEqual(response.status_code, 200)
        self.assertIn("offline demo mode", response.get_json()["reply"])

    def test_chat_falls_back_when_gemini_request_fails_with_empty_context(self):
        model = Mock()
        model.generate_content.side_effect = ConnectionError("network unavailable")
        generative_ai = ModuleType("google.generativeai")
        generative_ai.configure = Mock()
        generative_ai.GenerativeModel = Mock(return_value=model)
        google_package = ModuleType("google")
        google_package.__path__ = []
        google_package.generativeai = generative_ai

        with (
            patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}),
            patch.dict(
                sys.modules,
                {"google": google_package, "google.generativeai": generative_ai},
            ),
        ):
            response = self.client.post("/api/chat", json={"message": "Hello"})

        self.assertEqual(response.status_code, 200)
        self.assertIn("offline demo mode", response.get_json()["reply"])
        model.generate_content.assert_called_once_with("Hello")


if __name__ == "__main__":
    unittest.main()