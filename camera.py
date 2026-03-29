"""
GuardianLens – Camera & Fall Detection module.
Uses OpenCV + MediaPipe Pose Landmarker to detect falls from a webcam or IP camera.
Serves an MJPEG stream and exposes fall-detection helpers.
"""

import cv2
import numpy as np
import time
import os
import threading
from dotenv import load_dotenv

load_dotenv()

# Default camera settings
CAMERA_URL = os.getenv("CAMERA_URL", "0")
FALL_SENSITIVITY = float(os.getenv("FALL_SENSITIVITY", "0.22"))
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "pose_landmarker_lite.task")

# Camera configuration
_current_camera_source = "default"  # "default" or "ip"
_current_ip_url = ""
_camera_source_lock = threading.Lock()

# ── Fall detection state ─────────────────────────────────────────────────────
_prev_pose = "unknown"
_fall_start_time = None
_fall_active = False
_safe_start_time = None

FALL_CONFIRM_SECONDS = 1.5   # lying this long → fall alert
SAFE_CONFIRM_SECONDS = 3.0   # standing this long → recovery

# Camera state
_camera_paused = False
_camera_lock = threading.Lock()
_latest_frame = None
_fall_status = "SCANNING"

# Thread control
_camera_thread = None
_camera_running = False


def _classify_pose(landmarks) -> str:
    """Classify body pose from MediaPipe landmarks as standing / sitting / lying."""
    lm = landmarks.landmark if hasattr(landmarks, 'landmark') else landmarks

    # Key points
    nose = lm[0]
    l_shoulder, r_shoulder = lm[11], lm[12]
    l_hip, r_hip = lm[23], lm[24]
    l_knee, r_knee = lm[25], lm[26]
    l_ankle, r_ankle = lm[27], lm[28]

    key_points = [nose, l_shoulder, r_shoulder, l_hip, r_hip, l_knee, r_knee, l_ankle, r_ankle]

    xs = [p.x for p in key_points]
    ys = [p.y for p in key_points]

    x_span = max(xs) - min(xs)
    y_span = max(ys) - min(ys)

    if y_span < 0.01:
        return "unknown"

    aspect = x_span / y_span

    if aspect > 0.8:
        return "lying"
    elif aspect > 0.15:
        return "sitting"
    else:
        return "standing"


def _detect_fall(pose: str, log_fn=None):
    """State machine for fall detection."""
    global _prev_pose, _fall_start_time, _fall_active, _safe_start_time, _fall_status

    if pose == "lying":
        _safe_start_time = None
        if _fall_start_time is None:
            _fall_start_time = time.time()
        elif time.time() - _fall_start_time >= FALL_CONFIRM_SECONDS and not _fall_active:
            _fall_active = True
            _fall_status = "FALL_DETECTED"
            if log_fn:
                log_fn("Fall Detected", "A potential fall has been detected by the AI.", "🚨")
    elif _fall_active and pose in ("standing", "sitting"):
        _fall_start_time = None
        if _safe_start_time is None:
            _safe_start_time = time.time()
        elif time.time() - _safe_start_time >= SAFE_CONFIRM_SECONDS:
            _fall_active = False
            _fall_status = "RECOVERED"
            _safe_start_time = None
            if log_fn:
                log_fn("Person Recovered", "The person has gotten up after a fall.", "✅")
    else:
        _fall_start_time = None
        _safe_start_time = None
        if not _fall_active:
            _fall_status = "SAFE" if pose in ("standing", "sitting") else "SCANNING"

    _prev_pose = pose


def get_fall_status() -> dict:
    return {
        "status": _fall_status,
        "fall_active": _fall_active,
        "pose": _prev_pose,
        "paused": _camera_paused,
    }


def pause_camera():
    global _camera_paused
    _camera_paused = True


def resume_camera():
    global _camera_paused
    _camera_paused = False


def _init_detector():
    """Initialise MediaPipe Pose Landmarker."""
    try:
        import mediapipe as mp
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision

        base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
        )
        return vision.PoseLandmarker.create_from_options(options)
    except Exception as e:
        print(f"[Camera] Could not load pose model: {e}")
        return None


def _camera_loop(log_fn=None):
    """Background thread that reads from the camera, runs pose detection, and stores the latest frame."""
    global _latest_frame, _fall_status, _camera_running

    try:
        import mediapipe as mp
    except ImportError:
        mp = None

    # Get the current camera source
    source = _get_camera_source()
    
    # Try to open camera with fallback
    cap = None
    for attempt in range(3):
        try:
            cap = cv2.VideoCapture(source)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            
            # Test if camera is accessible
            ret, test_frame = cap.read()
            if ret and test_frame is not None:
                break
            else:
                cap.release()
                cap = None
                time.sleep(1)
        except Exception as e:
            if cap:
                cap.release()
            cap = None
            time.sleep(1)

    if cap is None or not cap.isOpened():
        # Fallback to default camera
        try:
            cap = cv2.VideoCapture(0)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            if log_fn:
                log_fn("Camera Fallback", f"IP camera failed, using default camera", "⚠️")
        except Exception:
            if log_fn:
                log_fn("Camera Error", "No camera available", "❌")
            return

    detector = _init_detector()

    try:
        while _camera_running and cap.isOpened():
            if _camera_paused:
                time.sleep(0.1)
                continue

            ret, frame = cap.read()
            if not ret or frame is None:
                # Try to reconnect
                cap.release()
                time.sleep(2)
                cap = cv2.VideoCapture(_get_camera_source())
                continue

            frame = cv2.resize(frame, (640, 480))
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Pose detection
            if detector and mp:
                try:
                    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                    result = detector.detect(mp_img)

                    if result.pose_landmarks:
                        marks = result.pose_landmarks[0]
                        pose = _classify_pose_from_result(marks)
                        _detect_fall(pose, log_fn)

                        # Draw landmarks
                        for idx in [0, 11, 12, 23, 24, 25, 26, 27, 28]:
                            lm = marks[idx]
                            x, y = int(lm.x * 640), int(lm.y * 480)
                            cv2.circle(rgb, (x, y), 5, (0, 200, 100), -1)

                        # Draw connections
                        connections = [(11, 12), (11, 23), (12, 24), (23, 24), (23, 25), (24, 26), (25, 27), (26, 28)]
                        for a, b in connections:
                            pt1 = (int(marks[a].x * 640), int(marks[a].y * 480))
                            pt2 = (int(marks[b].x * 640), int(marks[b].y * 480))
                            cv2.line(rgb, pt1, pt2, (0, 200, 100), 2)
                    else:
                        if not _fall_active:
                            _fall_status = "SCANNING"
                except Exception as e:
                    # Mediapipe can raise during shutdown; log and continue
                    print(f"[Camera] Detection error: {e}")

            # Overlay status text
            color_map = {
                "SAFE": (0, 200, 100),
                "FALL_DETECTED": (0, 0, 255),
                "SCANNING": (200, 200, 0),
                "RECOVERED": (0, 200, 100),
            }
            status_color = color_map.get(_fall_status, (200, 200, 200))
            cv2.putText(rgb, f"Status: {_fall_status}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, status_color, 2)

            with _camera_lock:
                _latest_frame = rgb.copy()

            # Reduced delay for more responsive motion detection
            time.sleep(0.016)  # ~60 FPS for better responsiveness
    finally:
        try:
            cap.release()
        except Exception:
            pass


def _classify_pose_from_result(marks) -> str:
    """Classify pose from PoseLandmarker result landmarks (list of NormalizedLandmark)."""
    key_indices = [0, 11, 12, 23, 24, 25, 26, 27, 28]
    xs = [marks[i].x for i in key_indices]
    ys = [marks[i].y for i in key_indices]

    x_span = max(xs) - min(xs)
    y_span = max(ys) - min(ys)

    if y_span < 0.01:
        return "unknown"

    aspect = x_span / y_span

    if aspect > 0.8:
        return "lying"
    elif aspect > 0.15:
        return "sitting"
    else:
        return "standing"


def generate_mjpeg():
    """Generator that yields MJPEG frames for the /api/live-feed endpoint."""
    while True:
        with _camera_lock:
            frame = _latest_frame

        if frame is not None:
            # Convert RGB back to BGR for JPEG encoding
            bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            _, jpeg = cv2.imencode('.jpg', bgr, [cv2.IMWRITE_JPEG_QUALITY, 80])
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n'
            )
        else:
            # No frame yet — send a small placeholder
            time.sleep(0.1)
            continue

        time.sleep(0.016)  # Match the faster frame rate


def set_camera_source(source: str, ip_url: str = ""):
    """Set the camera source (default or IP)."""
    global _current_camera_source, _current_ip_url
    with _camera_source_lock:
        _current_camera_source = source
        _current_ip_url = ip_url


def restart_camera_thread(log_fn=None):
    """Restart the camera thread with new settings."""
    global _camera_thread, _camera_running
    
    # Stop current thread
    _camera_running = False
    if _camera_thread:
        _camera_thread.join(timeout=2.0)
        _camera_thread = None
    
    # Start new thread
    _camera_running = True
    _camera_thread = threading.Thread(target=_camera_loop, args=(log_fn,), daemon=True)
    _camera_thread.start()


def get_camera_source():
    """Get the current camera source configuration."""
    with _camera_source_lock:
        return _current_camera_source, _current_ip_url


def _get_camera_source():
    """Get the actual camera source to use."""
    source, ip_url = get_camera_source()
    if source == "ip" and ip_url:
        return ip_url
    return CAMERA_URL


def start_camera_thread(log_fn=None):
    """Start the camera processing in a background thread."""
    global _camera_thread, _camera_running
    if _camera_thread and _camera_thread.is_alive():
        return _camera_thread

    _camera_running = True
    _camera_thread = threading.Thread(target=_camera_loop, args=(log_fn,), daemon=True)
    _camera_thread.start()
    return _camera_thread


def stop_camera_thread(timeout: float = 2.0):
    """Signal the camera thread to stop and join it (best-effort)."""
    global _camera_thread, _camera_running
    _camera_running = False
    if _camera_thread:
        _camera_thread.join(timeout)
        if _camera_thread.is_alive():
            try:
                # Let it be daemon; nothing else we can safely do.
                print("[Camera] Warning: camera thread did not stop in time")
            except Exception:
                pass
        _camera_thread = None
