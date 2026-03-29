"""
GuardianLens – AI chat helper.
Uses Groq (primary) or OpenAI (fallback) to answer questions
with context from calendar events and activity logs.
"""

import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


def _build_system_prompt(events: list, activities: list) -> str:
    """Build a system prompt with context about the user's calendar and recent activity."""
    event_text = ""
    if events:
        event_text = "\n".join(
            f"- {e.get('title', '')} on {e.get('event_date', '')} at {e.get('event_time', '')} ({e.get('event_type', 'reminder')})"
            for e in events[:10]
        )
    else:
        event_text = "No upcoming events."

    activity_text = ""
    if activities:
        activity_text = "\n".join(
            f"- {a.get('icon', '')} {a.get('title', '')} – {a.get('time', '')}"
            for a in activities[:15]
        )
    else:
        activity_text = "No recent activity."

    return f"""You are GuardianLens AI Assistant, a caring and helpful companion for elderly care monitoring.
You have access to the following context:

UPCOMING EVENTS / MEDICATIONS:
{event_text}

RECENT ACTIVITY LOG:
{activity_text}

Guidelines:
- Be warm, empathetic, and concise.
- If asked about medications or appointments, reference the calendar data above.
- If asked about recent activities or falls, reference the activity log above.
- If you don't have specific information, say so honestly.
- Keep responses brief and easy to understand for elderly users.
"""


def ask_ai(user_message: str, events: list, activities: list) -> str:
    """Send a message to the AI and return the response text."""
    system_prompt = _build_system_prompt(events, activities)

    # Try Groq first
    if GROQ_API_KEY:
        try:
            from groq import Groq
            client = Groq(api_key=GROQ_API_KEY)
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.7,
                max_tokens=500,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[AI] Groq error: {e}")

    # Fallback to OpenAI
    if OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.7,
                max_tokens=500,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[AI] OpenAI error: {e}")

    return "I'm sorry, no AI provider is currently configured. Please set GROQ_API_KEY or OPENAI_API_KEY in your .env file."
