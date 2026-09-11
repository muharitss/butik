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
import {
  OrderListPage,
  OrderCreatePage,
  OrderDetailPage,
} from '../features/orders/index.ts';
import { RevisionsPage } from '../features/revisions/index.ts';
import { PaymentsPage } from '../features/payments/index.ts';
import { FittingsPage } from '../features/fittings/index.ts';

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
