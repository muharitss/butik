import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { PlaceholderPage } from './pages/PlaceholderPage.tsx';

import {
  CustomerListPage,
  CustomerDetailPage,
  CustomerCreatePage,
  CustomerEditPage,
} from '../features/customers/index.ts';
import { GarmentListPage } from '../features/garments/index.ts';

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
        element: <CustomerListPage />,
      },
      {
        path: 'customers/new',
        element: <CustomerCreatePage />,
      },
      {
        path: 'customers/:id',
        element: <CustomerDetailPage />,
      },
      {
        path: 'customers/:id/edit',
        element: <CustomerEditPage />,
      },
      {
        path: 'garments',
        element: <GarmentListPage />,
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
