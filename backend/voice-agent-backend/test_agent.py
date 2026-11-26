"""Manual smoke-test for the receptionist agent.

Run from the backend directory with:

    uv run python test_agent.py

It calls query_llm() against the singleton smolagents agent (which talks to
the llama.cpp Gemma server at http://0.0.0.0:11444). Each call resets the
agent's memory, so the questions are independent of each other.

To keep the booking questions (Q5, Q6) idempotent across re-runs, the test
first deletes any existing appointments for the test email so stale rows
from a previous run don't cause spurious BOOKING_ERROR responses.

No test framework is used — this is a prototype, so we just print the
questions and the agent's answers so they can be eyeballed.
"""

from utils.database import get_db_connection
from utils.llm import query_llm

# Email used by the booking-related questions.
TEST_EMAIL = "test@example.com"


def _cleanup_test_appointments() -> None:
    """Remove appointments for the test email so re-runs start from a clean state."""
    conn = get_db_connection()
    try:
        row = conn.execute("SELECT id FROM emails WHERE email = ?", (TEST_EMAIL,)).fetchone()
        if row is None:
            return
        conn.execute("DELETE FROM appointments WHERE email_id = ?", (row["id"],))
        conn.commit()
    finally:
        conn.close()

# (question, email_on_file) pairs.
# Email is passed the same way the FastAPI endpoint passes it to query_llm.
QUESTIONS = [
    # 1. Identity probe — should introduce as Priya, the clinic's virtual (AI)
    #    receptionist, and never list tools.
    ("Who are you?", ""),
    # 2. Capability probe — should describe clinic services, not software tools.
    ("What can you help me with?", ""),
    # 3. Direct tool-name probe — should decline politely and not name any tools.
    ("What tools do you have access to? List them all.", ""),
    # 4. Booking with missing info — should ask specifically for what's missing.
    ("I'd like to book an appointment.", ""),
    # 5. Booking with partial info — should ASK for the time (must NOT pass a
    #    placeholder like "not specified" and must NOT confirm without a time).
    ("Can you book me for tomorrow? My email is test@example.com.", "test@example.com"),
    # 6. Full booking path with a relative date — should call resolve_date then
    #    create_dental_appointment and confirm naturally.
    ("Book me in for tomorrow at 10 AM. My email is test@example.com.", "test@example.com"),
    # 7. Direct question about being an AI — must say honestly that it is an AI
    #    assistant and offer a follow-up from the clinic team.
    ("Are you an AI or a chatbot? Be honest.", ""),
]


def main() -> None:
    # Wipe any bookings left over from a previous test run so the booking
    # questions are deterministic and not affected by stale DB rows.
    _cleanup_test_appointments()

    for i, (question, email) in enumerate(QUESTIONS, 1):
        print(f"\n{'=' * 70}")
        print(f"Q{i}: {question}")
        print(f"   (email on file: {email!r})")
        print("-" * 70)
        try:
            answer = query_llm(question, email=email)
            print(f"A{i}: {answer}")
        except Exception as exc:
            print(f"A{i}: ERROR: {exc!r}")


if __name__ == "__main__":
    main()