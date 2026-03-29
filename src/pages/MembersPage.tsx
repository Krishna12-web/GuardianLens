import { useEffect, useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';

interface Member {
  id: number;
  name: string;
  role: string;
  face_encoding: string | null;
  created_at: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('family');

  const load = () => {
    api.getMembers().then(setMembers).catch(() => {});
  };

  useEffect(load, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name) return;
    await api.addMember(name, role);
    setName('');
    load();
  };

  const getInitials = (n: string) => {
    return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleColor = (r: string) => {
    const map: Record<string, string> = {
      family: 'var(--gradient-primary)',
      caregiver: 'var(--gradient-accent)',
      doctor: 'var(--gradient-success)',
      nurse: 'var(--gradient-danger)',
    };
    return map[r] || 'var(--gradient-primary)';
  };

  return (
    <div>
      <div className="page-header">
        <h2>Members</h2>
        <p>Manage household members and caregivers</p>
      </div>

      {/* Add Member Form */}
      <motion.div
        className="card"
        style={{ marginBottom: 24 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="card-header">
          <span className="card-title">➕ Add Member</span>
        </div>
        <form onSubmit={handleAdd}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="family">👨‍👩‍👧 Family</option>
                <option value="caregiver">🤝 Caregiver</option>
                <option value="doctor">👨‍⚕️ Doctor</option>
                <option value="nurse">👩‍⚕️ Nurse</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 'none' }}>
              <label className="form-label">&nbsp;</label>
              <button className="btn btn-primary" type="submit">Add</button>
            </div>
          </div>
        </form>
      </motion.div>

      {/* Members Grid */}
      {members.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p>No members added yet</p>
          </div>
        </div>
      ) : (
        <div className="members-grid">
          {members.map((member, i) => (
            <motion.div
              key={member.id}
              className="member-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div
                className="member-avatar"
                style={{ background: getRoleColor(member.role) }}
              >
                {getInitials(member.name)}
              </div>
              <div className="member-name">{member.name}</div>
              <div className="member-role">{member.role}</div>
              <span className="member-role-badge">
                {member.face_encoding ? '✅ Face Enrolled' : '📸 No Face Data'}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
