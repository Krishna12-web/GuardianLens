// Use relative URL so Vite proxy forwards to FastAPI backend on port 8000
const API_BASE = '';

export const api = {
  // Stats
  getStats: () => fetch(`${API_BASE}/api/stats`).then(r => r.json()),

  // Live Feed
  liveFeedUrl: `/api/live-feed`,
  getFallStatus: () => fetch(`${API_BASE}/api/fall-status`).then(r => r.json()),
  pauseCamera: () => fetch(`${API_BASE}/api/camera/pause`, { method: 'POST' }).then(r => r.json()),
  resumeCamera: () => fetch(`${API_BASE}/api/camera/resume`, { method: 'POST' }).then(r => r.json()),

  // Camera Settings
  getCameraSettings: () => fetch(`${API_BASE}/api/camera/settings`).then(r => r.json()),
  updateCameraSettings: (settings: { camera_source: string; ip_camera_url?: string }) =>
    fetch(`${API_BASE}/api/camera/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).then(r => r.json()),
  testIpCamera: () => fetch(`${API_BASE}/api/camera/test-ip`).then(r => r.json()),

  // Members
  getMembers: () => fetch(`${API_BASE}/api/members`).then(r => r.json()),
  addMember: (name: string, role: string) =>
    fetch(`${API_BASE}/api/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role }),
    }).then(r => r.json()),
  enrollFace: (memberId: number, faceData: string) =>
    fetch(`${API_BASE}/api/members/${memberId}/enroll-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ face_data: faceData }),
    }).then(r => r.json()),

  // Calendar
  getEvents: () => fetch(`${API_BASE}/api/calendar`).then(r => r.json()),
  addEvent: (title: string, eventDate: string, eventTime: string, description: string, eventType: string) =>
    fetch(`${API_BASE}/api/calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, event_date: eventDate, event_time: eventTime, description, event_type: eventType }),
    }).then(r => r.json()),
  deleteEvent: (eventId: number) =>
    fetch(`${API_BASE}/api/calendar/${eventId}`, { method: 'DELETE' }).then(r => r.json()),

  // Activity
  getActivity: () => fetch(`${API_BASE}/api/activity`).then(r => r.json()),

  // Chat
  sendChat: (message: string) =>
    fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }).then(r => r.json()),
  getChatHistory: () => fetch(`${API_BASE}/api/chat/history`).then(r => r.json()),
};
