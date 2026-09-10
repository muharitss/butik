import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { apiClient } from '../lib/apiClient.ts';

interface HealthStatus {
  loading: boolean;
  online: boolean;
  statusText: string;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊', id: 'nav-dashboard' },
  { path: '/orders', label: 'Orders', icon: '📋', id: 'nav-orders' },
  { path: '/customers', label: 'Customers', icon: '👥', id: 'nav-customers' },
  { path: '/garments', label: 'Garment Types', icon: '✂️', id: 'nav-garments' },
  { path: '/calendar', label: 'Calendar', icon: '📅', id: 'nav-calendar' },
  { path: '/payments', label: 'Payments', icon: '💳', id: 'nav-payments' },
  { path: '/fittings', label: 'Fittings', icon: '🪡', id: 'nav-fittings' },
  { path: '/revisions', label: 'Revisions', icon: '🔄', id: 'nav-revisions' },
  { path: '/receipts', label: 'Receipts', icon: '🧾', id: 'nav-receipts' },
];

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState<HealthStatus>({
    loading: true,
    online: false,
    statusText: 'Checking...',
  });

  const location = useLocation();

  const checkHealth = async () => {
    setHealth((prev) => ({ ...prev, loading: true }));
    try {
      const data = await apiClient.get<{ status: string }>('/health');
      setHealth({
        loading: false,
        online: data?.status === 'ok',
        statusText: data?.status || 'ok',
      });
    } catch (err) {
      setHealth({
        loading: false,
        online: false,
        statusText: err instanceof Error ? err.message : 'Offline',
      });
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  // Close mobile sidebar on route navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const currentNav = navItems.find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  );

  return (
    <div className="app-layout">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`} id="app-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo-icon">🧵</div>
          <div className="brand-info">
            <h1 className="brand-title">JahitFlow</h1>
            <span className="brand-tagline">Boutique & Tailoring OS</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main Navigation">
          <div className="nav-section-title">WORKSPACE</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              id={item.id}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="backend-health-card">
            <div className="health-row">
              <span className="health-label">Backend API</span>
              <button
                type="button"
                id="btn-recheck-health"
                className="health-refresh-btn"
                onClick={checkHealth}
                title="Recheck backend health"
                aria-label="Recheck backend health"
              >
                ↻
              </button>
            </div>
            <div className="health-indicator-container">
              <span
                className={`status-dot ${
                  health.loading ? 'pulse' : health.online ? 'online' : 'offline'
                }`}
                aria-hidden="true"
              />
              <span className="health-status-text">
                {health.loading ? 'Checking...' : health.online ? 'Online (status: ok)' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="app-main">
        <header className="app-header" id="app-header">
          <button
            type="button"
            id="btn-toggle-sidebar"
            className="mobile-toggle-btn"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>

          <div className="header-breadcrumbs">
            <span className="breadcrumb-root">JahitFlow</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{currentNav?.label || 'Overview'}</span>
          </div>

          <div className="header-actions">
            <span className="version-tag">MVP v0.1</span>
          </div>
        </header>

        <main className="app-content" id="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
