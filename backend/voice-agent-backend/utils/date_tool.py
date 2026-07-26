"""Tool for resolving relative date expressions to ISO dates."""

import logging
from datetime import datetime, timedelta

from smolagents import tool

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Common relative date mappings
RELATIVE_DATES = {
    "today": "today",
    "tomorrow": "tomorrow",
    "yesterday": "yesterday",
    "next monday": "next monday",
    "next tuesday": "next tuesday",
    "next wednesday": "next wednesday",
    "next thursday": "next thursday",
    "next friday": "next friday",
    "next saturday": "next saturday",
    "next sunday": "next sunday",
    "monday": "this monday",
    "tuesday": "this tuesday",
    "wednesday": "this wednesday",
    "thursday": "this thursday",
    "friday": "this friday",
    "saturday": "this saturday",
    "sunday": "this sunday",
}


def _resolve_relative_date(date_str: str, ref_date: datetime = None) -> str:
    """Resolve a relative date string to an actual ISO date (YYYY-MM-DD).

    Examples:
        'today'    -> 2026-06-28
        'tomorrow' -> 2026-06-29
        'next monday' -> next Monday's date
        'this monday' -> this week's Monday
    """
    if ref_date is None:
        ref_date = datetime.now()

    date_str = date_str.strip().lower()

    if date_str == "today":
        return ref_date.strftime("%Y-%m-%d")
    elif date_str == "tomorrow":
        return (ref_date + timedelta(days=1)).strftime("%Y-%m-%d")
    elif date_str == "yesterday":
        return (ref_date - timedelta(days=1)).strftime("%Y-%m-%d")
    elif date_str.startswith("next "):
        day_name = date_str[5:]
        # Find the next occurrence of this day
        days_map = {
            "monday": 0,
            "tuesday": 1,
            "wednesday": 2,
            "thursday": 3,
            "friday": 4,
            "saturday": 5,
            "sunday": 6,
        }
        if day_name in days_map:
            target_dow = days_map[day_name]
            days_ahead = target_dow - ref_date.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return (ref_date + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    elif date_str.startswith("this "):
        day_name = date_str[5:]
        days_map = {
            "monday": 0,
            "tuesday": 1,
            "wednesday": 2,
            "thursday": 3,
            "friday": 4,
            "saturday": 5,
            "sunday": 6,
        }
        if day_name in days_map:
            target_dow = days_map[day_name]
            days_ahead = target_dow - ref_date.weekday()
            if days_ahead < 0:
                days_ahead += 7
            return (ref_date + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    # If it looks like an ISO date already, return it as-is
    import re

    if re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
        return date_str

    # Return original if we can't resolve it
    return date_str


@tool
def resolve_date(date_str: str) -> str:
    """Convert a relative date expression into a YYYY-MM-DD date string.

    Use this before booking whenever the caller says something like
    'today', 'tomorrow', 'this Friday', 'next Monday', or a bare weekday.
    If the caller already gave an explicit YYYY-MM-DD date, you do not need
    this tool.

    Args:
        date_str: The date expression the caller used, e.g. 'tomorrow'.

    Returns:
        The resolved date as an ISO string (e.g. '2026-07-13').
    """
    resolved = _resolve_relative_date(date_str)
    logger.info("Resolved '%s' to '%s'", date_str, resolved)
    return resolved
