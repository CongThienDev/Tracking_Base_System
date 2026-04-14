import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { getAdminApiToken, setAdminApiToken } from '../../shared/lib/admin-api-token';

const links = [
  { to: '/', label: 'Overview' },
  { to: '/events', label: 'Events' },
  { to: '/debugger', label: 'Event Debugger' },
  { to: '/flow', label: 'Flow Explorer' },
  { to: '/phase-7', label: 'Phase 7 Cutover' }
];

export function AppShell() {
  const [adminToken, setAdminToken] = useState(() => getAdminApiToken() ?? '');

  useEffect(() => {
    setAdminApiToken(adminToken);
  }, [adminToken]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Tracking Base Console</p>
          <h1>First-party Tracking Operations Frontend</h1>
        </div>
        <p className="topbar-note">Store-before-send. Dedup by event_id. Async fan-out delivery.</p>
      </header>

      <section className="card" style={{ display: 'grid', gap: '12px', marginTop: '14px' }}>
        <div className="card-head" style={{ marginBottom: 0 }}>
          <h2>Admin Access</h2>
          <p>
            Saved locally in this browser and attached only to <code>/admin/*</code> requests. Leave it empty when
            the API is intentionally open in development.
          </p>
        </div>
        <label style={{ display: 'grid', gap: '6px', fontWeight: 500, color: '#2f2622' }}>
          Admin API token
          <input
            type="password"
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
            placeholder="ADMIN_API_TOKEN"
            autoComplete="off"
            spellCheck={false}
            style={{
              height: '38px',
              borderRadius: '10px',
              border: '1px solid #ccbca6',
              padding: '0 10px',
              font: 'inherit',
              background: '#fff'
            }}
          />
        </label>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <p className="muted-small">{adminToken.trim() ? 'Token saved in localStorage.' : 'No token saved.'}</p>
          <div className="toolbar-actions">
            <button type="button" className="ghost-btn" onClick={() => setAdminToken('')}>
              Clear
            </button>
          </div>
        </div>
      </section>

      <nav className="nav-grid" aria-label="Main navigation">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) => (isActive ? 'nav-chip is-active' : 'nav-chip')}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
