import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Overview' },
  { to: '/events', label: 'Events' },
  { to: '/debugger', label: 'Event Debugger' },
  { to: '/flow', label: 'Flow Explorer' },
  { to: '/phase-7', label: 'Phase 7 Cutover' }
];

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Tracking Base Console</p>
          <h1>First-party Tracking Operations Frontend</h1>
        </div>
        <p className="topbar-note">Store-before-send. Dedup by event_id. Async fan-out delivery.</p>
      </header>

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
