import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  MessageCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { fetchCustomer, deleteCustomer } from '../api/customers.api.ts';
import { OrderHistorySection } from '../components/OrderHistorySection.tsx';
import { CustomerMeasurementsSection } from '../../measurements/index.ts';
import type { Customer } from '../types/customers.types.ts';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCustomer(id);
        setCustomer(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customer profile');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCustomer(id);
      navigate('/customers');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete customer');
    } finally {
      setDeleting(false);
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  // Build clean WhatsApp link from phone number
  const getWhatsAppUrl = (rawPhone: string) => {
    const digits = rawPhone.replace(/\D/g, '');
    let normalized = digits;
    if (normalized.startsWith('0')) {
      normalized = '62' + normalized.slice(1);
    }
    return `https://wa.me/${normalized}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" />
        <span>Loading customer profile...</span>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-4 max-w-xl mx-auto py-10">
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Customer Not Found</AlertTitle>
          <AlertDescription>
            {error || 'The requested customer profile could not be loaded.'}
          </AlertDescription>
        </Alert>
        <Link to="/customers" className={buttonVariants({ variant: 'outline' })}>
          <ArrowLeft className="size-4 mr-1.5" />
          Back to Customers Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="customer-detail-page">
      {/* Back Button & Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/customers"
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className: '-ml-2 text-muted-foreground hover:text-foreground',
          })}
        >
          <ArrowLeft className="size-4 mr-1.5" />
          Back to Customer Directory
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to={`/customers/${customer.id}/edit`}
            id="btn-edit-customer"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Pencil className="size-3.5 mr-1.5" />
            Edit Customer
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            id="btn-delete-customer"
          >
            <Trash2 className="size-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Customer Header Summary Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-heading text-2xl font-bold">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground tracking-tight">
                {customer.name}
              </h1>
              <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  Client since {formatDateTime(customer.createdAt)}
                </span>
                <span>•</span>
                <span>ID: <code className="text-[11px]">{customer.id.slice(0, 8)}</code></span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
          {/* Phone Contact */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Phone className="size-3.5" /> Phone / Mobile
            </span>
            {customer.phone ? (
              <div className="flex items-center gap-2 pt-0.5">
                <a
                  href={`tel:${customer.phone}`}
                  className="text-sm font-medium hover:underline text-foreground"
                >
                  {customer.phone}
                </a>
                <a
                  href={getWhatsAppUrl(customer.phone)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={buttonVariants({
                    size: 'xs',
                    variant: 'outline',
                    className: 'gap-1 text-xs',
                  })}
                  title="Open in WhatsApp"
                >
                  <MessageCircle className="size-3 text-emerald-600 dark:text-emerald-400" />
                  WhatsApp
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not provided</p>
            )}
          </div>

          {/* Email Contact */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Mail className="size-3.5" /> Email Address
            </span>
            {customer.email ? (
              <a
                href={`mailto:${customer.email}`}
                className="text-sm font-medium hover:underline text-foreground block pt-0.5"
              >
                {customer.email}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not provided</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <MapPin className="size-3.5" /> Mailing / Delivery Address
            </span>
            <p className="text-sm text-foreground pt-0.5 whitespace-pre-wrap">
              {customer.address || <span className="text-muted-foreground italic">Not provided</span>}
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="size-3.5" /> Tailor Notes & Preferences
            </span>
            <div className="rounded-md bg-muted/50 p-3 text-sm text-foreground whitespace-pre-wrap">
              {customer.notes || (
                <span className="text-muted-foreground italic text-xs">
                  No notes recorded for this customer.
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Body Measurements (Current Summary + History + New Entry) */}
      <CustomerMeasurementsSection
        customerId={customer.id}
        customerName={customer.name}
      />

      {/* Customer Order History Section */}
      <OrderHistorySection customerId={customer.id} orders={customer.orders} />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent id="dialog-confirm-delete-detail">
          <DialogHeader>
            <DialogTitle>Delete Customer Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{customer.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Cannot delete customer</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground">
            This customer will be soft-deleted and removed from the active directory.
          </p>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              id="btn-confirm-delete-from-detail"
            >
              {deleting && <Loader2 className="size-3.5 animate-spin mr-1" />}
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
