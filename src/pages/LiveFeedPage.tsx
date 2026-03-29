import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';

interface FallStatus {
  status: string;
  fall_active: boolean;
  pose: string;
  paused: boolean;
}

interface CameraSettings {
  camera_source: string;
  ip_camera_url: string;
}

export default function LiveFeedPage() {
  const [fallStatus, setFallStatus] = useState<FallStatus | null>(null);
  const [paused, setPaused] = useState(false);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings | null>(null);

  useEffect(() => {
    const poll = () => {
      api.getFallStatus().then((s: FallStatus) => {
        setFallStatus(s);
        setPaused(s.paused);
      }).catch(() => {});
    };
    
    const loadSettings = async () => {
      try {
        const settings = await api.getCameraSettings();
        setCameraSettings(settings);
      } catch (error) {
        console.error('Failed to load camera settings:', error);
      }
    };

    poll();
    loadSettings();
    
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  const togglePause = async () => {
    if (paused) {
      await api.resumeCamera();
      setPaused(false);
    } else {
      await api.pauseCamera();
      setPaused(true);
    }
  };

  const getStatusBadge = () => {
    if (!fallStatus) return 'scanning';
    if (fallStatus.paused) return 'scanning';
    if (fallStatus.fall_active) return 'danger';
    if (fallStatus.status === 'SAFE') return 'safe';
    return 'scanning';
  };

  const getStatusText = () => {
    if (!fallStatus) return 'Connecting...';
    if (fallStatus.paused) return 'Paused';
    if (fallStatus.fall_active) return '🚨 FALL DETECTED';
    if (fallStatus.status === 'SAFE') return '✅ Person Safe';
    return '🔍 Scanning...';
  };

  return (
    <div>
      <div className="page-header">
        <h2>Live Feed</h2>
        <p>Real-time camera stream with AI pose detection</p>
      </div>

      <div className="grid-3">
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="card-header">
            <span className="card-title">📹 Sentinel View</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-secondary" onClick={togglePause}>
                {paused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
            </div>
          </div>

          <div className="live-feed-container">
            {paused ? (
              <div className="paused-overlay">
                <div className="paused-icon">🔒</div>
                <p>Camera paused for privacy</p>
                <button className="btn btn-primary btn-sm" onClick={togglePause}>
                  ▶️ Resume Feed
                </button>
              </div>
            ) : (
              <img
                src={api.liveFeedUrl}
                alt="Live Feed"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div className="feed-overlay">
              <span className="feed-badge live">● LIVE</span>
              <span className={`feed-badge ${getStatusBadge()}`}>{getStatusText()}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-header">
            <span className="card-title">🎯 Detection Info</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-title">Current Pose</div>
                <div className="setting-desc">AI-detected body position</div>
              </div>
              <span className="badge badge-success" style={{ textTransform: 'capitalize' }}>
                {fallStatus?.pose || 'unknown'}
              </span>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-title">Fall Alert</div>
                <div className="setting-desc">Active fall detection status</div>
              </div>
              <span className={`badge ${fallStatus?.fall_active ? 'badge-danger' : 'badge-success'}`}>
                {fallStatus?.fall_active ? '🚨 Active' : '✅ Clear'}
              </span>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-title">System Status</div>
                <div className="setting-desc">Overall detection engine status</div>
              </div>
              <span className="badge badge-success">
                {fallStatus?.status || 'SCANNING'}
              </span>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-title">Camera Source</div>
                <div className="setting-desc">Current camera being used</div>
              </div>
              <span className={`badge ${cameraSettings?.camera_source === 'ip' ? 'badge-primary' : 'badge-success'}`}>
                {cameraSettings?.camera_source === 'ip' ? '🌐 IP Webcam' : '📹 Default Camera'}
              </span>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-title">Camera Status</div>
                <div className="setting-desc">Camera feed status</div>
              </div>
              <span className={`badge ${paused ? 'badge-warning' : 'badge-success'}`}>
                {paused ? '⏸️ Paused' : '▶️ Active'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
