import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export const RevisionsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');
  const fittingId = searchParams.get('fittingId');

  useEffect(() => {
    if (orderId) {
      const target = `/orders/${orderId}?action=create-revision${
        fittingId ? `&fittingId=${encodeURIComponent(fittingId)}` : ''
      }`;
      navigate(target, { replace: true });
    }
  }, [orderId, fittingId, navigate]);

  if (orderId) {
    return null;
  }

  return (
    <div className="space-y-6" id="revisions-hub-page">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground tracking-tight">
            Garment Revisions & Alterations
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Alterations and fit revisions are scoped to individual customer orders.
        </p>
      </div>

      <div className="p-8 border rounded-lg bg-card shadow-xs space-y-4 max-w-xl">
        <p className="text-sm text-muted-foreground">
          Open an order from the order list to view or record customer garment revision and alteration details.
        </p>

        <div className="pt-2">
          <Link to="/orders" className={buttonVariants({ variant: 'default', size: 'sm' })}>
            View Orders <ArrowRight className="size-3.5 ml-1.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
