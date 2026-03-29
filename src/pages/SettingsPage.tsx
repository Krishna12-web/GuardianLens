import { useState } from 'react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [autoResume, setAutoResume] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('gl_auth');
    window.location.href = '/';
  };

  return (
    <div>
      <div className="page-header">
        <h2>Settings</h2>
        <p>Configure your GuardianLens preferences</p>
      </div>

      <div style={{ maxWidth: 700 }}>
        {/* Notifications */}
        <motion.div
          className="card settings-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3>🔔 Notifications</h3>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-title">Push Notifications</div>
              <div className="setting-desc">Receive alerts for falls and important events</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={notifications} onChange={() => setNotifications(!notifications)} />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-title">Sound Alerts</div>
              <div className="setting-desc">Play audio when critical events occur</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={soundAlerts} onChange={() => setSoundAlerts(!soundAlerts)} />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </motion.div>

        {/* Camera */}
        <motion.div
          className="card settings-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3>📹 Camera</h3>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-title">Auto-Resume Camera</div>
              <div className="setting-desc">Automatically resume feed after privacy pause</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={autoResume} onChange={() => setAutoResume(!autoResume)} />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-title">Fall Sensitivity</div>
              <div className="setting-desc">Configured via FALL_SENSITIVITY in .env</div>
            </div>
            <span className="badge badge-success">0.22</span>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div
          className="card settings-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3>🔒 Security</h3>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-title">Authentication</div>
              <div className="setting-desc">Currently in Demo Mode</div>
            </div>
            <span className="badge badge-warning">Demo</span>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-title">Privacy Mode</div>
              <div className="setting-desc">All data processed locally, never stored in cloud</div>
            </div>
            <span className="badge badge-success">✅ Active</span>
          </div>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button className="btn btn-danger" onClick={handleLogout} style={{ width: '100%' }}>
            🚪 Sign Out
          </button>
        </motion.div>
      </div>
    </div>
  );
}
