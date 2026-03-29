"""
GuardianLens – SQLite database helpers.
All tables are created lazily (if they don't exist yet).
"""

import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "guardianlens.db")


def _conn():
    """Return a new connection with row_factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they don't exist."""
    conn = _conn()
    c = conn.cursor()

    c.execute("""CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'family',
        face_encoding TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime'))
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        event_date TEXT NOT NULL,
        event_time TEXT NOT NULL,
        event_type TEXT DEFAULT 'reminder',
        created_at TEXT DEFAULT (datetime('now','localtime'))
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        icon TEXT DEFAULT '📋',
        time TEXT DEFAULT (datetime('now','localtime'))
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        message TEXT NOT NULL,
        time TEXT DEFAULT (datetime('now','localtime'))
    )""")

    # Create settings table for camera configuration
    c.execute("""CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )""")

    # Insert default camera settings if table is empty
    c.execute("SELECT COUNT(*) FROM settings")
    if c.fetchone()[0] == 0:
        c.execute("INSERT INTO settings (key, value) VALUES (?, ?)", ("camera_source", "default"))
    
    conn.commit()
    conn.close()


# ── Activity Log ─────────────────────────────────────────────────────────────

def log_activity(title: str, description: str = "", icon: str = "📋"):
    conn = _conn()
    conn.execute(
        "INSERT INTO activity_log (title, description, icon) VALUES (?, ?, ?)",
        (title, description, icon),
    )
    conn.commit()
    conn.close()


def get_activity_log(limit: int = 50):
    conn = _conn()
    rows = conn.execute(
        "SELECT * FROM activity_log ORDER BY id DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Members ──────────────────────────────────────────────────────────────────

def add_member(name: str, role: str = "family"):
    conn = _conn()
    c = conn.execute(
        "INSERT INTO members (name, role) VALUES (?, ?)", (name, role)
    )
    member_id = c.lastrowid
    conn.commit()
    conn.close()
    return member_id


def get_members():
    conn = _conn()
    rows = conn.execute("SELECT * FROM members ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def enroll_face(member_id: int, face_data: str):
    conn = _conn()
    conn.execute(
        "UPDATE members SET face_encoding = ? WHERE id = ?", (face_data, member_id)
    )
    conn.commit()
    conn.close()


# ── Calendar ─────────────────────────────────────────────────────────────────

def add_event(title: str, event_date: str, event_time: str,
              description: str = "", event_type: str = "reminder"):
    conn = _conn()
    conn.execute(
        "INSERT INTO calendar_events (title, description, event_date, event_time, event_type) VALUES (?,?,?,?,?)",
        (title, description, event_date, event_time, event_type),
    )
    conn.commit()
    conn.close()


def get_events():
    conn = _conn()
    rows = conn.execute(
        "SELECT * FROM calendar_events ORDER BY event_date, event_time"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_event(event_id: int):
    conn = _conn()
    conn.execute("DELETE FROM calendar_events WHERE id = ?", (event_id,))
    conn.commit()
    conn.close()


# ── Chat History ─────────────────────────────────────────────────────────────

def save_chat_message(role: str, message: str):
    conn = _conn()
    conn.execute(
        "INSERT INTO chat_history (role, message) VALUES (?, ?)", (role, message)
    )
    conn.commit()
    conn.close()


def get_chat_history(limit: int = 50):
    conn = _conn()
    rows = conn.execute(
        "SELECT * FROM chat_history ORDER BY id DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in reversed(rows)]


# ── Stats ────────────────────────────────────────────────────────────────────

def get_stats():
    conn = _conn()
    today = datetime.now().strftime("%Y-%m-%d")

    total_alerts = conn.execute(
        "SELECT COUNT(*) FROM activity_log WHERE title LIKE '%Fall%'"
    ).fetchone()[0]

    alerts_today = conn.execute(
        "SELECT COUNT(*) FROM activity_log WHERE title LIKE '%Fall%' AND time LIKE ?",
        (f"{today}%",),
    ).fetchone()[0]

    total_members = conn.execute("SELECT COUNT(*) FROM members").fetchone()[0]

    last_activity = conn.execute(
        "SELECT time FROM activity_log ORDER BY id DESC LIMIT 1"
    ).fetchone()

    conn.close()
    return {
        "total_alerts": total_alerts,
        "alerts_today": alerts_today,
        "total_members": total_members,
        "last_activity": last_activity[0] if last_activity else "No activity yet",
        "hours_monitored": round((datetime.now() - datetime.now().replace(hour=0, minute=0, second=0)).total_seconds() / 3600, 1),
    }


def get_camera_settings():
    """Get camera configuration settings."""
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT key, value FROM settings WHERE key IN ('camera_source', 'ip_camera_url')")
    settings = {row[0]: row[1] for row in cur.fetchall()}
    conn.close()
    
    # Default values
    default_settings = {
        "camera_source": "default",  # "default" or "ip"
        "ip_camera_url": ""
    }
    default_settings.update(settings)
    return default_settings


def update_camera_settings(camera_source: str, ip_camera_url: str = ""):
    """Update camera configuration settings."""
    conn = _conn()
    cur = conn.cursor()
    
    # Create settings table if it doesn't exist
    cur.execute("""CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )""")
    
    # Delete existing settings
    cur.execute("DELETE FROM settings WHERE key IN ('camera_source', 'ip_camera_url')")
    
    # Insert new settings
    cur.execute("INSERT INTO settings (key, value) VALUES (?, ?)", ("camera_source", camera_source))
    if ip_camera_url:
        cur.execute("INSERT INTO settings (key, value) VALUES (?, ?)", ("ip_camera_url", ip_camera_url))
    
    conn.commit()
    conn.close()


# Auto-init on import
init_db()
