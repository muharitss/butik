import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { PlaceholderPage } from './pages/PlaceholderPage.tsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'orders',
        element: (
          <PlaceholderPage
            title="Orders Management"
            icon="📋"
            phase="Phase 3 (TASK-014 – TASK-017)"
            description="Manage client custom tailoring orders, line items, status workflow transitions, and measurement snapshots."
          />
        ),
      },
      {
        path: 'customers',
        element: (
          <PlaceholderPage
            title="Customer Directory"
            icon="👥"
            phase="Phase 1 (TASK-006 – TASK-008)"
            description="Client directory, contact details, measurement versions, and bespoke history."
          />
        ),
      },
      {
        path: 'garments',
        element: (
          <PlaceholderPage
            title="Garment Types & Measurement Templates"
            icon="✂️"
            phase="Phase 2 (TASK-009 – TASK-013)"
            description="Configure garment models (Kebaya, Jas, Kemeja, etc.) and their custom measurement field specifications."
          />
        ),
      },
      {
        path: 'calendar',
        element: (
          <PlaceholderPage
            title="Production Calendar"
            icon="📅"
            phase="Phase 8 (TASK-028)"
            description="Visual timeline for fitting appointments, deadlines, and delivery schedules."
          />
        ),
      },
      {
        path: 'payments',
        element: (
          <PlaceholderPage
            title="Payment Ledger"
            icon="💳"
            phase="Phase 4 (TASK-018 – TASK-019)"
            description="Down payments, balance settlements, reversal adjustments, and revenue tracking."
          />
        ),
      },
      {
        path: 'fittings',
        element: (
          <PlaceholderPage
            title="Fittings & Alterations"
            icon="🪡"
            phase="Phase 5 (TASK-020 – TASK-021)"
            description="Schedule customer fitting sessions, record measurement adjustments, and resolve garment fit."
          />
        ),
      },
      {
        path: 'revisions',
        element: (
          <PlaceholderPage
            title="Revisions Tracking"
            icon="🔄"
            phase="Phase 5 (TASK-022 – TASK-023)"
            description="Track customer-requested modifications and alteration tasks."
          />
        ),
      },
      {
        path: 'receipts',
        element: (
          <PlaceholderPage
            title="Receipts & Invoicing"
            icon="🧾"
            phase="Phase 9 (TASK-029 – TASK-030)"
            description="Generate clean printable receipts and WhatsApp notification links."
          />
        ),
      },
      {
        path: '*',
        element: (
          <PlaceholderPage
            title="Page Not Found"
            icon="❓"
            phase="404"
            description="The requested page route could not be found."
          />
        ),
      },
    ],
  },
]);
