import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { Scissors, ArrowRight } from 'lucide-react';

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
    <div className="space-y-6 max-w-2xl mx-auto py-12 text-center" id="revisions-hub-page">
      <div className="p-8 border rounded-lg bg-card shadow-xs space-y-4">
        <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Scissors className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">Garment Revisions & Alterations</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Alterations and fit revisions are scoped to individual customer orders. Open an order from the list below to view or log alteration requests.
          </p>
        </div>

        <div className="pt-2">
          <Link to="/orders" className={buttonVariants({ variant: 'default', size: 'sm' })}>
            View Orders <ArrowRight className="size-3.5 ml-1.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
