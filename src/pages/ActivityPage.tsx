import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';

interface Activity {
  id: number;
  title: string;
  description: string;
  icon: string;
  time: string;
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    api.getActivity().then(setActivities).catch(() => {});
    const interval = setInterval(() => {
      api.getActivity().then(setActivities).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="page-header">
        <h2>Activity Log</h2>
        <p>Chronological record of all system events</p>
      </div>

      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="card-header">
          <span className="card-title">📋 All Activity</span>
          <span className="badge badge-success">{activities.length} events</span>
        </div>

        <div className="activity-list">
          {activities.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No activity logged yet. Events will appear here as the system detects them.</p>
            </div>
          ) : (
            activities.map((act, i) => (
              <motion.div
                key={act.id}
                className="activity-item"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <div className="activity-icon">{act.icon}</div>
                <div className="activity-info">
                  <div className="activity-title">{act.title}</div>
                  <div className="activity-desc">{act.description}</div>
                </div>
                <div className="activity-time">
                  {new Date(act.time).toLocaleString([], {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
