"""
GuardianLens – FastAPI backend entry point.
Run with:  python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import sys
import cv2

# Ensure the project root is on the path so 'backend' pkg resolves
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(ROOT_DIR, ".env"))

from backend import database as db
from backend import ai_helper
from backend import camera

# ── App Setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="GuardianLens API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Start camera thread on startup
@app.on_event("startup")
def startup():
    # Load camera settings from database
    settings = db.get_camera_settings()
    camera.set_camera_source(settings["camera_source"], settings["ip_camera_url"])
    camera.start_camera_thread(log_fn=db.log_activity)
    db.log_activity("System Started", "GuardianLens backend is online.", "🟢")


# ── Pydantic Models ─────────────────────────────────────────────────────────

class MemberCreate(BaseModel):
    name: str
    role: str = "family"

class FaceEnroll(BaseModel):
    face_data: str  # base64 image

class EventCreate(BaseModel):
    title: str
    event_date: str
    event_time: str
    description: str = ""
    event_type: str = "reminder"

class ChatMessage(BaseModel):
    message: str


# ── Live Feed ────────────────────────────────────────────────────────────────

@app.get("/api/live-feed")
def live_feed():
    return StreamingResponse(
        camera.generate_mjpeg(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )

@app.get("/api/fall-status")
def fall_status():
    return camera.get_fall_status()

@app.post("/api/camera/pause")
def camera_pause():
    camera.pause_camera()
    db.log_activity("Camera Paused", "Live feed paused for privacy.", "⏸️")
    return {"status": "paused"}

@app.post("/api/camera/resume")
def camera_resume():
    camera.resume_camera()
    db.log_activity("Camera Resumed", "Live feed resumed.", "▶️")
    return {"status": "resumed"}


# ── Stats ────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def stats():
    return db.get_stats()


# ── Members ──────────────────────────────────────────────────────────────────

@app.get("/api/members")
def list_members():
    return db.get_members()

@app.post("/api/members")
def create_member(member: MemberCreate):
    member_id = db.add_member(member.name, member.role)
    db.log_activity("Member Added", f"{member.name} ({member.role})", "👤")
    return {"id": member_id, "name": member.name, "role": member.role}

@app.post("/api/members/{member_id}/enroll-face")
def enroll_face(member_id: int, data: FaceEnroll):
    db.enroll_face(member_id, data.face_data)
    db.log_activity("Face Enrolled", f"Face data enrolled for member #{member_id}", "👤")
    return {"status": "enrolled"}


# ── Calendar ─────────────────────────────────────────────────────────────────

@app.get("/api/calendar")
def list_events():
    return db.get_events()

@app.post("/api/calendar")
def create_event(event: EventCreate):
    db.add_event(event.title, event.event_date, event.event_time,
                 event.description, event.event_type)
    db.log_activity("Event Created", f"{event.title} on {event.event_date}", "📅")
    return {"status": "created"}

@app.delete("/api/calendar/{event_id}")
def remove_event(event_id: int):
    db.delete_event(event_id)
    return {"status": "deleted"}


# ── Activity ─────────────────────────────────────────────────────────────────

@app.get("/api/activity")
def activity():
    return db.get_activity_log()


# ── Chat ─────────────────────────────────────────────────────────────────────

@app.post("/api/chat")
def chat(msg: ChatMessage):
    db.save_chat_message("user", msg.message)

    events = db.get_events()
    activities = db.get_activity_log(limit=15)

    reply = ai_helper.ask_ai(msg.message, events, activities)
    db.save_chat_message("assistant", reply)

    return {"reply": reply}

@app.get("/api/chat/history")
def chat_history():
    return db.get_chat_history()


# ── Health Check ─────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "GuardianLens"}


# ── IP Camera Settings ───────────────────────────────────────────────────────

class CameraSettings(BaseModel):
    camera_source: str  # "default" or "ip"
    ip_camera_url: Optional[str] = None

@app.get("/api/camera/settings")
def get_camera_settings():
    return db.get_camera_settings()

@app.post("/api/camera/settings")
def update_camera_settings(settings: CameraSettings):
    db.update_camera_settings(settings.camera_source, settings.ip_camera_url or "")
    camera.set_camera_source(settings.camera_source, settings.ip_camera_url or "")
    camera.restart_camera_thread(log_fn=db.log_activity)
    db.log_activity("Camera Settings Updated", f"Camera source: {settings.camera_source}", "📹")
    return {"status": "updated", "settings": db.get_camera_settings()}

@app.get("/api/camera/test-ip")
def test_ip_camera():
    """Test if the configured IP camera is accessible."""
    settings = db.get_camera_settings()
    if settings["camera_source"] != "ip" or not settings["ip_camera_url"]:
        return {"status": "error", "message": "No IP camera configured"}
    
    try:
        import cv2
        cap = cv2.VideoCapture(settings["ip_camera_url"])
        ret, frame = cap.read()
        cap.release()
        
        if ret:
            return {"status": "success", "message": "IP camera is accessible"}
        else:
            return {"status": "error", "message": "Unable to connect to IP camera"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
