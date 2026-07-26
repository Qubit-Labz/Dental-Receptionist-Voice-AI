"""smolagents tool for creating dental appointments."""

import logging
import re
from datetime import datetime

from smolagents import tool

from .database import _normalize_time, create_appointment

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Reject placeholder strings an LLM may emit when it doesn't actually have the
# value. These must never be stored as a real appointment.
_PLACEHOLDER_RE = re.compile(
    r"^\s*(not\s*specified|not\s*provided|unknown|n/?a|none|tbd|null|unspecified|missing|\-+)\s*$",
    re.IGNORECASE,
)

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _is_valid_time(value: str) -> bool:
    """True if `value` parses to a real HH:MM time via _normalize_time."""
    normalised = _normalize_time(value)
    return bool(re.match(r"^\d{2}:\d{2}$", normalised))


@tool
def create_dental_appointment(
    email: str,
    appointment_date: str,
    appointment_time: str,
) -> str:
    """Book (create) a dental appointment for the caller at ABC Dental Registry.

    Call this ONLY once you genuinely have all three required details from the
    caller. Never pass placeholders such as 'not specified', 'unknown', 'TBD',
    or an empty string for any argument — if you don't have a real value, do
    not call this tool; ask the caller for the missing detail instead.

    Args:
        email: The caller's email address, e.g. 'jane@example.com'.
        appointment_date: The appointment date in YYYY-MM-DD form, e.g.
            '2026-07-13'. Resolve any relative date with resolve_date first.
        appointment_time: The appointment time, e.g. '10:00 AM' or '10 AM'.

    Returns:
        A string starting with 'BOOKING_CONFIRMED |' on success (includes the
        reference, date, time and email); 'BOOKING_INVALID |' if any argument
        is missing, a placeholder, or not in a valid format (ask the caller for
        the specific field named in the message); or 'BOOKING_ERROR |' if the
        slot is already taken. Do not call this tool again with the same
        arguments on a booking error.
    """
    logger.info(
        "Creating appointment for %s on %s at %s",
        email,
        appointment_date,
        appointment_time,
    )

    # --- Validate inputs before touching the DB. A failed validation is NOT a
    #     booking conflict — it means the caller hasn't actually given us a
    #     usable value, so the agent must go back and ask for it.
    for name, value in (("email", email), ("appointment_date", appointment_date),
                        ("appointment_time", appointment_time)):
        if not value or _PLACEHOLDER_RE.match(str(value)):
            return (
                f"BOOKING_INVALID | {name} is missing. "
                f"Ask the caller for their {name.replace('_', ' ')} and do not guess it."
            )

    if not _EMAIL_RE.match(email):
        return (
            "BOOKING_INVALID | email is not a valid email address. "
            "Ask the caller for a correct email address."
        )

    if not _DATE_RE.match(appointment_date):
        return (
            "BOOKING_INVALID | appointment_date must be in YYYY-MM-DD form. "
            "Use the resolve_date tool first, or ask the caller for the exact date."
        )
    try:
        datetime.strptime(appointment_date, "%Y-%m-%d")
    except ValueError:
        return (
            "BOOKING_INVALID | appointment_date is not a real calendar date. "
            "Ask the caller for a valid date."
        )

    if not _is_valid_time(appointment_time):
        return (
            "BOOKING_INVALID | appointment_time is not a recognisable time. "
            "Ask the caller for a valid time, e.g. '10:00 AM'."
        )

    try:
        result = create_appointment(email, appointment_date, appointment_time)
        return (
            f"BOOKING_CONFIRMED | Appointment confirmed! "
            f"Reference: {result['reference']} "
            f"Date: {result['date']} at {result['time']} "
            f"Email: {result['email']}"
        )
    except ValueError as e:
        return f"BOOKING_ERROR | {e}"