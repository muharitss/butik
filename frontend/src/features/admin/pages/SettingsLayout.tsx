import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Users, Sliders } from 'lucide-react';

export const SettingsLayout: React.FC = () => {
  return (
    <div className="settings-layout space-y-6">
      {/* Settings Navigation Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-4" aria-label="Settings Tabs">
          <NavLink
            to="/settings/users"
            id="tab-settings-users"
            className={({ isActive }) =>
              `flex items-center gap-2 py-3 px-1 border-b-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-primary text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`
            }
          >
            <Users className="size-4" />
            <span>Users & Staff</span>
          </NavLink>

          <NavLink
            to="/settings/general"
            id="tab-settings-general"
            className={({ isActive }) =>
              `flex items-center gap-2 py-3 px-1 border-b-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-primary text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`
            }
          >
            <Sliders className="size-4" />
            <span>General Boutique Settings</span>
          </NavLink>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="settings-content">
        <Outlet />
      </div>
    </div>
  );
};
