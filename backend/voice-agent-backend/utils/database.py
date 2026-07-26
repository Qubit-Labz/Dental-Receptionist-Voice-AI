"""SQLite database for users and appointments."""

import logging
import os
import sqlite3

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "appointments.db")


def get_db_connection() -> sqlite3.Connection:
    """Return a new database connection with row factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables if they don't already exist."""
    conn = get_db_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS emails (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email_id INTEGER NOT NULL,
                appointment_date TEXT NOT NULL,
                appointment_time TEXT NOT NULL,
                reference TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (email_id) REFERENCES emails(id)
            )
        """)
        conn.commit()
        logger.info("Database initialised at '%s'", DB_PATH)
    finally:
        conn.close()


def upsert_email(email: str) -> int:
    """Insert or look up an email address. Returns the email row id."""
    conn = get_db_connection()
    try:
        cursor = conn.execute(
            "INSERT OR IGNORE INTO emails (email) VALUES (?);", (email,)
        )
        conn.commit()
        row = conn.execute("SELECT id FROM emails WHERE email = ?", (email,)).fetchone()
        return row["id"]
    finally:
        conn.close()


def _normalize_time(time_str: str) -> str:
    """Normalise a time string to HH:MM (24h) for comparison.

    Handles hour-only and minute forms, with or without a space, and
    AM/PM variants including lowercase and dotted forms ('a.m.', 'p.m.'):
        '6:00 PM'  -> '18:00'
        '06:00 AM' -> '06:00'
        '14:30'    -> '14:30'
        '10 AM'    -> '10:00'
        '10AM'     -> '10:00'
        '12 a.m.'  -> '00:00'
        '12 p.m.'  -> '12:00'
    """
    from datetime import datetime

    # Strip dots so 'a.m.'/'p.m.' become 'am'/'pm', which strptime's %p accepts.
    cleaned = time_str.strip().replace(".", "")
    formats = [
        "%I:%M %p",  # '10:00 AM'
        "%I:%M%p",   # '10:00AM'
        "%I %p",     # '10 AM', '10 am'
        "%I%p",      # '10AM', '10am'
        "%H:%M",     # '14:30'
        "%H:%M:%S",  # '14:30:00'
    ]
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt).strftime("%H:%M")
        except ValueError:
            continue
    return cleaned


def check_schedule_conflict(appointment_date: str, appointment_time: str) -> bool:
    """Check whether a slot is already booked.

    Returns True if there is a conflict.
    """
    normalised = _normalize_time(appointment_time)

    conn = get_db_connection()
    try:
        rows = conn.execute(
            "SELECT appointment_time FROM appointments WHERE appointment_date = ?",
            (appointment_date,),
        ).fetchall()
        for r in rows:
            if _normalize_time(r["appointment_time"]) == normalised:
                return True
        return False
    finally:
        conn.close()


def get_all_appointments() -> list[dict]:
    """Return all appointments joined with email."""
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """SELECT a.*, e.email
               FROM appointments a
               JOIN emails e ON a.email_id = e.id"""
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_appointment(
    email: str,
    appointment_date: str,
    appointment_time: str,
) -> dict:
    """Create an appointment and return it as a dict.

    Raises ValueError if the slot is already taken.
    """
    import uuid

    if check_schedule_conflict(appointment_date, appointment_time):
        raise ValueError(
            f"The slot {appointment_time} on {appointment_date} is already booked. "
            "Please choose a different time or date."
        )

    email_id = upsert_email(email)
    reference = str(uuid.uuid4())[:8].upper()

    conn = get_db_connection()
    try:
        conn.execute(
            """INSERT INTO appointments (email_id, appointment_date, appointment_time, reference)
               VALUES (?, ?, ?, ?)""",
            (email_id, appointment_date, appointment_time, reference),
        )
        conn.commit()

        email_row = conn.execute(
            "SELECT email FROM emails WHERE id = ?", (email_id,)
        ).fetchone()

        return {
            "reference": reference,
            "email": email_row["email"],
            "date": appointment_date,
            "time": appointment_time,
        }
    finally:
        conn.close()


# Initialise on import so the DB is ready when the app starts
init_db()
