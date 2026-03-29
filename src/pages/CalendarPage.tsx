import { useEffect, useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';

interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  event_type: string;
  created_at: string;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('reminder');
  const [desc, setDesc] = useState('');

  const load = () => {
    api.getEvents().then(setEvents).catch(() => {});
  };

  useEffect(load, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time) return;
    await api.addEvent(title, date, time, desc, type);
    setTitle(''); setDate(''); setTime(''); setDesc('');
    load();
  };

  const handleDelete = async (id: number) => {
    await api.deleteEvent(id);
    load();
  };

  const parseDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return { day: d.getDate(), month: MONTHS[d.getMonth()] };
  };

  const getTypeEmoji = (t: string) => {
    const map: Record<string, string> = {
      medication: '💊', appointment: '🏥', reminder: '🔔', exercise: '🏃', meal: '🍽️',
    };
    return map[t] || '📅';
  };

  return (
    <div>
      <div className="page-header">
        <h2>Calendar</h2>
        <p>Manage medication reminders, appointments, and scheduled events</p>
      </div>

      <div className="grid-3">
        {/* Events List */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="card-header">
            <span className="card-title">📅 Upcoming Events</span>
            <span className="badge badge-success">{events.length} events</span>
          </div>

          <div className="events-list">
            {events.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <p>No events scheduled yet</p>
              </div>
            ) : (
              events.map((event) => {
                const { day, month } = parseDate(event.event_date);
                return (
                  <motion.div
                    key={event.id}
                    className="event-item"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    layout
                  >
                    <div className="event-date-badge">
                      <span className="day">{day}</span>
                      <span className="month">{month}</span>
                    </div>
                    <div className="event-details">
                      <div className="event-title">
                        {getTypeEmoji(event.event_type)} {event.title}
                      </div>
                      <div className="event-meta">
                        {event.event_time} · {event.event_type}
                        {event.description && ` · ${event.description}`}
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(event.id)}
                      title="Delete event"
                    >
                      ✕
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Add Event Form */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-header">
            <span className="card-title">➕ Add Event</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                placeholder="e.g., Take blood pressure medication"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Time</label>
                <input
                  className="form-input"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="reminder">🔔 Reminder</option>
                <option value="medication">💊 Medication</option>
                <option value="appointment">🏥 Appointment</option>
                <option value="exercise">🏃 Exercise</option>
                <option value="meal">🍽️ Meal</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input
                className="form-input"
                placeholder="Additional details..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>
              📅 Add Event
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
