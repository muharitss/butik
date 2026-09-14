// Pages
export { CustomerListPage } from './pages/CustomerListPage.tsx';
export { CustomerDetailPage } from './pages/CustomerDetailPage.tsx';
export { CustomerCreatePage } from './pages/CustomerCreatePage.tsx';
export { CustomerEditPage } from './pages/CustomerEditPage.tsx';

// Types
export type {
  Customer,
  CustomerInput,
  PossibleDuplicate,
  PaginationMeta,
  CustomerPaymentHistoryItem,
} from './types/customers.types.ts';

// Components
export { OrderHistorySection } from './components/OrderHistorySection.tsx';
export { CustomerStatsCards } from './components/CustomerStatsCards.tsx';
export { CustomerPaymentsTab } from './components/CustomerPaymentsTab.tsx';
