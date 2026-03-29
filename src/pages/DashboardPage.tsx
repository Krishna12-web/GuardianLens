import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';

interface Stats {
  total_alerts: number;
  alerts_today: number;
  total_members: number;
  last_activity: string;
  hours_monitored: number;
}

interface Activity {
  id: number;
  title: string;
  description: string;
  icon: string;
  time: string;
}

interface FallStatus {
  status: string;
  fall_active: boolean;
  pose: string;
  paused: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [fallStatus, setFallStatus] = useState<FallStatus | null>(null);

  useEffect(() => {
    const load = () => {
      api.getStats().then(setStats).catch(() => {});
      api.getActivity().then((data: Activity[]) => setActivities(data.slice(0, 8))).catch(() => {});
      api.getFallStatus().then(setFallStatus).catch(() => {});
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { icon: '⏱️', label: 'Hours Monitored', value: stats?.hours_monitored ?? '—', accent: 'var(--gradient-primary)' },
    { icon: '🚨', label: 'Alerts Today', value: stats?.alerts_today ?? 0, accent: 'var(--gradient-danger)' },
    { icon: '👥', label: 'Members', value: stats?.total_members ?? 0, accent: 'var(--gradient-accent)' },
    { icon: '📋', label: 'Total Alerts', value: stats?.total_alerts ?? 0, accent: 'var(--gradient-success)' },
  ];

  const getStatusBadge = () => {
    if (!fallStatus) return <span className="badge badge-warning">Connecting...</span>;
    if (fallStatus.paused) return <span className="badge badge-warning">⏸️ Paused</span>;
    if (fallStatus.fall_active) return <span className="badge badge-danger">🚨 FALL DETECTED</span>;
    if (fallStatus.status === 'SAFE') return <span className="badge badge-success">✅ Safe</span>;
    return <span className="badge badge-warning">🔍 Scanning</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Real-time monitoring overview {getStatusBadge()}</p>
      </div>

      <div className="stats-grid">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            className="stat-card"
            style={{ '--stat-accent': card.accent } as React.CSSProperties}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid-3">
        {/* Live Feed Preview */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="card-header">
            <span className="card-title">📹 Live Feed Preview</span>
            {getStatusBadge()}
          </div>
          <div className="live-feed-container" style={{ aspectRatio: '16/9' }}>
            {fallStatus?.paused ? (
              <div className="paused-overlay">
                <div className="paused-icon">⏸️</div>
                <p>Camera paused for privacy</p>
              </div>
            ) : (
              <img
                src={api.liveFeedUrl}
                alt="Live Feed"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div className="feed-overlay">
              <span className="feed-badge live">● LIVE</span>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="card-header">
            <span className="card-title">📋 Recent Activity</span>
          </div>
          <div className="activity-list">
            {activities.length === 0 ? (
              <div className="empty-state">
                <p>No activity yet</p>
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="activity-item">
                  <div className="activity-icon">{act.icon}</div>
                  <div className="activity-info">
                    <div className="activity-title">{act.title}</div>
                    <div className="activity-desc">{act.description}</div>
                  </div>
                  <div className="activity-time">
                    {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
