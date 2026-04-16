import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { getAdminApiToken, setAdminApiToken } from '../../shared/lib/admin-api-token';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/events', label: 'Events' },
  { to: '/debugger', label: 'Debugger' }
];

export function AppShell() {
  const [adminToken, setAdminToken] = useState(() => getAdminApiToken() ?? '');

  useEffect(() => {
    setAdminApiToken(adminToken);
  }, [adminToken]);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-block">
          <p className="eyebrow">Tracking Base Console</p>
          <h1>Tracking Ops</h1>
          <p className="sidebar-note">Realtime control surface.</p>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/dashboard'}
              className={({ isActive }) => (isActive ? 'nav-chip is-active' : 'nav-chip')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <section className="token-panel">
          <div className="token-panel-head">
            <h2>Admin Access</h2>
            <p>Browser-local token.</p>
          </div>
          <label className="token-field">
            <span>Admin API token</span>
            <input
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              placeholder="ADMIN_API_TOKEN"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="token-panel-foot">
            <p className="muted-small">{adminToken.trim() ? 'Token stored locally.' : 'Token not set.'}</p>
            <button type="button" className="ghost-btn" onClick={() => setAdminToken('')}>
              Clear
            </button>
          </div>
        </section>
      </aside>

      <main className="app-main">
        <div className="app-main-head">
          <p className="eyebrow">System Workspace</p>
          <p className="topbar-note">Health, events, debugger, flow.</p>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
