import sqlite3
from pathlib import Path


DATABASE_PATH = Path(__file__).resolve().parent / "campus_bus.db"


def get_db_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db():
    connection = get_db_connection()
    try:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS routes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                route_name TEXT NOT NULL,
                description TEXT,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                is_verified INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS stops (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                route_id INTEGER NOT NULL,
                stop_name TEXT NOT NULL,
                arrival_time TEXT,
                departure_time TEXT,
                latitude REAL,
                longitude REAL,
                is_verified INTEGER DEFAULT 0,
                FOREIGN KEY (route_id) REFERENCES routes(id)
            );

            CREATE TABLE IF NOT EXISTS buses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bus_number TEXT NOT NULL,
                route_id INTEGER,
                driver_name TEXT,
                status TEXT DEFAULT 'OFFLINE',
                latitude REAL,
                longitude REAL,
                updated_at TEXT,
                is_verified INTEGER DEFAULT 0,
                FOREIGN KEY (route_id) REFERENCES routes(id)
            );

            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                alert_type TEXT DEFAULT 'GENERAL',
                is_active INTEGER DEFAULT 1,
                is_demo INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS campus_places (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                latitude REAL,
                longitude REAL,
                is_verified INTEGER DEFAULT 0,
                notes TEXT
            );

            CREATE TABLE IF NOT EXISTS university_info (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        )

        for table in ("routes", "stops", "buses"):
            columns = {
                row["name"]
                for row in connection.execute(f"PRAGMA table_info({table})")
            }
            if "is_verified" not in columns:
                connection.execute(
                    f"ALTER TABLE {table} ADD COLUMN is_verified INTEGER DEFAULT 0"
                )

        alert_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(alerts)")
        }
        if "is_demo" not in alert_columns:
            connection.execute(
                "ALTER TABLE alerts ADD COLUMN is_demo INTEGER DEFAULT 0"
            )

        legacy_demo_alerts = (
            "BUS-101 Delayed",
            "Hostel Express Route Change",
            "Campus Service Notice",
        )
        for title in legacy_demo_alerts:
            connection.execute(
                """UPDATE alerts
                   SET is_demo = 1, title = ?
                   WHERE title = ? AND is_demo = 0""",
                (f"(DEMO) {title}", title),
            )

        connection.commit()
    finally:
        connection.close()