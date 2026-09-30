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
                end_time TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS stops (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                route_id INTEGER NOT NULL,
                stop_name TEXT NOT NULL,
                arrival_time TEXT,
                departure_time TEXT,
                latitude REAL,
                longitude REAL,
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
                FOREIGN KEY (route_id) REFERENCES routes(id)
            );

            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                alert_type TEXT DEFAULT 'GENERAL',
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        connection.commit()
    finally:
        connection.close()