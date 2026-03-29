import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/live-feed', icon: '📹', label: 'Live Feed' },
  { path: '/camera-settings', icon: '🌐', label: 'Camera Settings' },
  { path: '/calendar', icon: '📅', label: 'Calendar' },
  { path: '/members', icon: '👥', label: 'Members' },
  { path: '/chat', icon: '🤖', label: 'AI Assistant' },
  { path: '/activity', icon: '📋', label: 'Activity' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🛡️</div>
        <h1>GuardianLens</h1>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="status-dot"></span>
          <span>System Online</span>
        </div>
      </div>
    </aside>
  );
}
