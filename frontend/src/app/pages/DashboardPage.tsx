import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.ts';

interface SmokeTestState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: { status: string };
  error?: string;
  latencyMs?: number;
  timestamp?: string;
}

export const DashboardPage: React.FC = () => {
  const [smokeTest, setSmokeTest] = useState<SmokeTestState>({
    status: 'idle',
  });

  const runHealthCheck = async () => {
    const startTime = performance.now();
    setSmokeTest({ status: 'loading' });
    try {
      const data = await apiClient.get<{ status: string }>('/health');
      const endTime = performance.now();
      setSmokeTest({
        status: 'success',
        data,
        latencyMs: Math.round(endTime - startTime),
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      const endTime = performance.now();
      setSmokeTest({
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown connection error',
        latencyMs: Math.round(endTime - startTime),
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const featureCards = [
    {
      title: 'Orders',
      icon: '📋',
      to: '/orders',
      desc: 'Track tailoring orders from draft through production, fittings, and delivery.',
      badge: 'Phase 3',
    },
    {
      title: 'Customers',
      icon: '👥',
      to: '/customers',
      desc: 'Manage client directory, contact information, and tailoring history.',
      badge: 'Phase 1',
    },
    {
      title: 'Garment Types & Measurements',
      icon: '✂️',
      to: '/garments',
      desc: 'Configure garment patterns, custom measurement fields, and client size versions.',
      badge: 'Phase 2',
    },
    {
      title: 'Calendar & Deadlines',
      icon: '📅',
      to: '/calendar',
      desc: 'Schedule fittings, monitor order completion deadlines, and prevent bottlenecks.',
      badge: 'Phase 8',
    },
    {
      title: 'Payments & Invoicing',
      icon: '💳',
      to: '/payments',
      desc: 'Record deposits and final settlements with immutable ledger tracking.',
      badge: 'Phase 4',
    },
    {
      title: 'Fittings & Alterations',
      icon: '🪡',
      to: '/fittings',
      desc: 'Schedule try-ons, record adjustments, and track revision cycles.',
      badge: 'Phase 5',
    },
  ];

  return (
    <div className="dashboard-container" id="dashboard-page">
      {/* Welcome Banner */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Boutique Operations Overview</h2>
          <p className="page-subtitle">
            Welcome to JahitFlow — the unified workspace for atelier and bespoke tailoring workflows.
          </p>
        </div>
      </div>

      {/* Health Check Smoke Test Banner */}
      <section className="smoke-test-card" id="health-smoke-test-card">
        <div className="smoke-test-header">
          <div className="smoke-test-title-group">
            <span className="smoke-test-icon" aria-hidden="true">
              🔌
            </span>
            <div>
              <h3 className="smoke-test-title">Backend API Health Connection</h3>
              <p className="smoke-test-meta">Endpoint: <code>GET /api/health</code></p>
            </div>
          </div>
          <button
            type="button"
            id="btn-run-smoke-test"
            className="btn btn-secondary"
            onClick={runHealthCheck}
            disabled={smokeTest.status === 'loading'}
          >
            {smokeTest.status === 'loading' ? 'Checking...' : 'Run Smoke Test'}
          </button>
        </div>

        <div className="smoke-test-body">
          {smokeTest.status === 'loading' && (
            <div className="status-banner loading">
              <span className="spinner" />
              <span>Connecting to backend server...</span>
            </div>
          )}

          {smokeTest.status === 'success' && (
            <div className="status-banner success" id="smoke-test-success">
              <div className="status-banner-badge">ONLINE</div>
              <div className="status-banner-content">
                <strong>Backend connected successfully.</strong>
                <p>
                  Response payload: <code>{JSON.stringify(smokeTest.data)}</code>
                  {smokeTest.latencyMs !== undefined && (
                    <span className="latency-badge">{smokeTest.latencyMs}ms</span>
                  )}
                  {smokeTest.timestamp && (
                    <span className="time-badge">checked at {smokeTest.timestamp}</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {smokeTest.status === 'error' && (
            <div className="status-banner error" id="smoke-test-error">
              <div className="status-banner-badge">OFFLINE / ERROR</div>
              <div className="status-banner-content">
                <strong>Backend connection failed.</strong>
                <p>Error: {smokeTest.error}</p>
                <small className="hint-text">
                  Ensure the backend server is running on port 4000 (<code>npm run dev</code> in <code>backend/</code>).
                </small>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Feature Modules Grid */}
      <section className="features-section">
        <h3 className="section-title">Core Tailoring Modules</h3>
        <div className="features-grid">
          {featureCards.map((card) => (
            <Link key={card.to} to={card.to} className="feature-card" id={`card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="feature-card-header">
                <span className="feature-card-icon">{card.icon}</span>
                <span className="feature-card-badge">{card.badge}</span>
              </div>
              <h4 className="feature-card-title">{card.title}</h4>
              <p className="feature-card-desc">{card.desc}</p>
              <div className="feature-card-link">
                <span>Open module</span>
                <span className="arrow-icon">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};
