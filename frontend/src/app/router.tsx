import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell.tsx';
import { ProtectedRoute } from './ProtectedRoute.tsx';
import { LoginPage } from '../features/auth/index.ts';
import { DashboardPage } from '../features/dashboard/index.ts';
import { PlaceholderPage } from './pages/PlaceholderPage.tsx';

import {
  CustomerListPage,
  CustomerDetailPage,
  CustomerCreatePage,
  CustomerEditPage,
} from '../features/customers/index.ts';
import { GarmentListPage } from '../features/garments/index.ts';
import {
  OrderListPage,
  OrderCreatePage,
  OrderDetailPage,
} from '../features/orders/index.ts';
import { RevisionsPage } from '../features/revisions/index.ts';
import { PaymentsPage } from '../features/payments/index.ts';
import { FittingsPage } from '../features/fittings/index.ts';
import { CalendarPage } from '../features/calendar/index.ts';
import { ReceiptsHubPage, OrderReceiptPage } from '../features/receipts/index.ts';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'orders',
        element: <OrderListPage />,
      },
      {
        path: 'orders/new',
        element: <OrderCreatePage />,
      },
      {
        path: 'orders/:id',
        element: <OrderDetailPage />,
      },
      {
        path: 'orders/:id/receipt',
        element: <OrderReceiptPage />,
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
        element: <CalendarPage />,
      },
      {
        path: 'payments',
        element: <PaymentsPage />,
      },
      {
        path: 'fittings',
        element: <FittingsPage />,
      },
      {
        path: 'revisions',
        element: <RevisionsPage />,
      },
      {
        path: 'receipts',
        element: <ReceiptsHubPage />,
      },
      {
        path: 'audit-logs',
        element: (
          <PlaceholderPage
            title="Audit Logs"
            icon="🛡️"
            phase="Phase 3 (TASK-039)"
            description="System activity audit logs and operator traceability."
          />
        ),
      },
      {
        path: 'settings',
        element: (
          <PlaceholderPage
            title="Boutique Settings"
            icon="⚙️"
            phase="Phase 3 (TASK-036)"
            description="Configure boutique profile, pricing defaults, and operational parameters."
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
