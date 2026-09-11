import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '../types/orders.types.ts';
import { getStatusBadgeVariant, getStatusLabel } from '../constants/orderRules.ts';
import {
  FileText,
  CheckCircle2,
  Scissors,
  Ruler,
  RefreshCw,
  PackageCheck,
  CheckCheck,
  XCircle,
} from 'lucide-react';

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
  showIcon?: boolean;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  className = '',
  showIcon = true,
}) => {
  const variant = getStatusBadgeVariant(status);
  const label = getStatusLabel(status);

  const renderIcon = () => {
    if (!showIcon) return null;
    const iconClass = 'size-3 mr-1 shrink-0';
    switch (status) {
      case 'DRAFT':
        return <FileText className={iconClass} />;
      case 'CONFIRMED':
        return <CheckCircle2 className={iconClass} />;
      case 'IN_PROGRESS':
        return <Scissors className={iconClass} />;
      case 'FITTING':
        return <Ruler className={iconClass} />;
      case 'REVISION':
        return <RefreshCw className={iconClass} />;
      case 'READY':
        return <PackageCheck className={iconClass} />;
      case 'COMPLETED':
        return <CheckCheck className={iconClass} />;
      case 'CANCELLED':
        return <XCircle className={iconClass} />;
      default:
        return null;
    }
  };

  return (
    <Badge variant={variant} className={`inline-flex items-center text-xs ${className}`}>
      {renderIcon()}
      {label}
    </Badge>
  );
};
