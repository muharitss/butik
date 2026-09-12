import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient.ts';
import { useAuth } from './AuthContext.tsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Scissors,
  Calendar,
  CreditCard,
  Ruler,
  RotateCcw,
  Receipt,
  Menu,
  RotateCw,
  Sparkles,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { hasPermission } from '../hooks/usePermission.ts';

interface HealthStatus {
  loading: boolean;
  online: boolean;
  statusText: string;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  id: string;
  permission?: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, id: 'nav-dashboard' },
  { path: '/orders', label: 'Orders', icon: ClipboardList, id: 'nav-orders' },
  { path: '/customers', label: 'Customers', icon: Users, id: 'nav-customers' },
  { path: '/garments', label: 'Garment Types', icon: Scissors, id: 'nav-garments' },
  { path: '/calendar', label: 'Calendar', icon: Calendar, id: 'nav-calendar' },
  { path: '/payments', label: 'Payments', icon: CreditCard, id: 'nav-payments' },
  { path: '/fittings', label: 'Fittings', icon: Ruler, id: 'nav-fittings' },
  { path: '/revisions', label: 'Revisions', icon: RotateCcw, id: 'nav-revisions' },
  { path: '/receipts', label: 'Receipts', icon: Receipt, id: 'nav-receipts' },
  { path: '/audit-logs', label: 'Audit Logs', icon: ShieldCheck, id: 'nav-audit-logs', permission: 'audit:view' },
  { path: '/settings', label: 'Settings', icon: Settings, id: 'nav-settings', permission: 'settings:manage' },
];


export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState<HealthStatus>({
    loading: true,
    online: false,
    statusText: 'Checking...',
  });

  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

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

  const visibleNavItems = navItems.filter(
    (item) => !item.permission || hasPermission(currentUser?.role, item.permission)
  );

  const currentNav = visibleNavItems.find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  );

  return (
    <div className="app-layout min-h-screen bg-background text-foreground flex flex-row">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="app-sidebar"
        className={`app-sidebar print:hidden fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 shrink-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="sidebar-brand flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
          <div className="brand-logo-icon flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-xs">
            <Sparkles className="size-4" />
          </div>
          <div className="brand-info min-w-0">
            <h1 className="brand-title font-heading text-lg font-bold tracking-tight text-sidebar-foreground truncate">
              JahitFlow
            </h1>
            <span className="brand-tagline block text-[10px] text-muted-foreground uppercase tracking-wider font-medium truncate">
              Boutique & Tailoring OS
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main Navigation">
          <div className="nav-section-title px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                id={item.id}
                className={({ isActive }) =>
                  `nav-item flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`
                }
                end={item.path === '/'}
              >
                <Icon className="nav-icon size-4 shrink-0" aria-hidden="true" />
                <span className="nav-label truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>


        {/* Footer / User Profile & Health Status */}
        <div className="sidebar-footer p-3 border-t border-sidebar-border space-y-2">
          {/* User Profile Card */}
          <div
            id="sidebar-user-card"
            className="user-profile-card flex items-center justify-between gap-2 p-2 rounded-md border border-sidebar-border bg-card/60 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserIcon className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground text-xs truncate" id="sidebar-user-name">
                  {currentUser?.name || 'Operator'}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider truncate" id="sidebar-user-role">
                  {currentUser?.role || 'Staff'}
                </div>
              </div>
            </div>
            <Button
              type="button"
              id="btn-sidebar-logout"
              variant="ghost"
              size="icon-xs"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>

          {/* Backend Health Card */}
          <div className="backend-health-card rounded-md border border-sidebar-border bg-card/50 p-2 text-xs">
            <div className="health-row flex items-center justify-between pb-1 border-b border-border/40 mb-1">
              <span className="health-label text-[10px] font-medium text-muted-foreground">
                Backend API
              </span>
              <Button
                type="button"
                id="btn-recheck-health"
                variant="ghost"
                size="icon-xs"
                onClick={checkHealth}
                title="Recheck backend health"
                aria-label="Recheck backend health"
                className="health-refresh-btn h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                <RotateCw className={`size-2.5 ${health.loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="health-indicator-container flex items-center gap-1.5">
              <span
                className={`status-dot size-1.5 shrink-0 rounded-full ${
                  health.loading
                    ? 'bg-muted-foreground animate-pulse'
                    : health.online
                    ? 'bg-emerald-500'
                    : 'bg-destructive'
                }`}
                aria-hidden="true"
              />
              <span className="health-status-text text-[10px] text-muted-foreground truncate">
                {health.loading ? 'Checking...' : health.online ? 'Online (status: ok)' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="app-main flex-1 flex flex-col min-w-0 min-h-screen print:min-h-0 print:block">
        <header
          className="app-header print:hidden h-16 border-b border-border bg-background/95 backdrop-blur-xs sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-4"
          id="app-header"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Button
              type="button"
              id="btn-toggle-sidebar"
              variant="ghost"
              size="icon-sm"
              className="mobile-toggle-btn md:hidden"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
            >
              <Menu className="size-4" />
            </Button>

            <div className="header-breadcrumbs flex items-center gap-2 text-xs text-muted-foreground truncate">
              <span className="breadcrumb-root font-medium text-foreground">JahitFlow</span>
              <span className="breadcrumb-separator text-muted-foreground/50">/</span>
              <span className="breadcrumb-current truncate font-medium text-foreground">
                {currentNav?.label || 'Overview'}
              </span>
            </div>
          </div>

          <div className="header-actions flex items-center gap-2 shrink-0">
            {currentUser && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground mr-1" id="header-user-info">
                <span className="font-medium text-foreground" id="header-user-name">
                  {currentUser.name}
                </span>
                <Badge variant="secondary" className="text-[10px] py-0 h-4">
                  {currentUser.role}
                </Badge>
              </div>
            )}
            <Button
              type="button"
              id="btn-header-logout"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs h-7 gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40"
              title="Sign out"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
            <Badge variant="outline" className="version-tag text-[10px] font-normal hidden md:inline-flex">
              MVP v0.1
            </Badge>
          </div>
        </header>

        <main className="app-content flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto print:p-0 print:m-0 print:max-w-none" id="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
