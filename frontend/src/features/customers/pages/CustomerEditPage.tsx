import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CustomerForm } from '../components/CustomerForm.tsx';
import { fetchCustomer, updateCustomer } from '../api/customers.api.ts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import type { Customer, CustomerInput } from '../types/customers.types.ts';

export const CustomerEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleUpdate = async (values: CustomerInput) => {
    if (!id) return {};
    await updateCustomer(id, values);
    navigate(`/customers/${id}`);
    return {};
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" />
        <span>Loading customer for editing...</span>
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
            {error || 'Unable to load customer for editing.'}
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
    <div className="py-2" id="customer-edit-page">
      <CustomerForm
        isEditing={true}
        initialValues={{
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          notes: customer.notes,
        }}
        onSubmit={handleUpdate}
        onCancel={() => navigate(`/customers/${customer.id}`)}
      />
    </div>
  );
};
