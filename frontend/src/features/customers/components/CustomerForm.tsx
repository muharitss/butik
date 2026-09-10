import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ExternalLink, Loader2, X } from 'lucide-react';
import type { CustomerInput, PossibleDuplicate } from '../types/customers.types.ts';

export interface CustomerFormProps {
  initialValues?: Partial<CustomerInput>;
  isEditing?: boolean;
  onSubmit: (values: CustomerInput) => Promise<{ possibleDuplicate?: PossibleDuplicate; createdId?: string }>;
  onCancel?: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CustomerForm: React.FC<CustomerFormProps> = ({
  initialValues = {},
  isEditing = false,
  onSubmit,
  onCancel,
}) => {
  const navigate = useNavigate();

  const [name, setName] = useState(initialValues.name || '');
  const [phone, setPhone] = useState(initialValues.phone || '');
  const [email, setEmail] = useState(initialValues.email || '');
  const [address, setAddress] = useState(initialValues.address || '');
  const [notes, setNotes] = useState(initialValues.notes || '');

  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [duplicateWarning, setDuplicateWarning] = useState<{
    duplicate: PossibleDuplicate;
    createdId?: string;
  } | null>(null);

  const validate = (): boolean => {
    const newErrors: { name?: string; email?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Customer name is required';
    }

    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload: CustomerInput = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      };

      const result = await onSubmit(payload);

      if (result?.possibleDuplicate) {
        setDuplicateWarning({
          duplicate: result.possibleDuplicate,
          createdId: result.createdId,
        });
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Dismissible Duplicate Warning Banner */}
      {duplicateWarning && (
        <Alert
          className="border-primary/40 bg-accent/40 text-foreground"
          id="alert-possible-duplicate"
        >
          <AlertTriangle className="size-4 text-primary" />
          <div className="flex-1 pr-6">
            <AlertTitle className="font-semibold text-primary">
              Possible Duplicate Customer Detected
            </AlertTitle>
            <AlertDescription className="mt-1 space-y-2 text-xs">
              <p>
                A customer with this phone number already exists:{' '}
                <strong>{duplicateWarning.duplicate.name}</strong>
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => navigate(`/customers/${duplicateWarning.duplicate.id}`)}
                >
                  <ExternalLink className="size-3 mr-1" />
                  View Existing ({duplicateWarning.duplicate.name})
                </Button>
                {duplicateWarning.createdId && (
                  <Button
                    type="button"
                    size="xs"
                    variant="secondary"
                    onClick={() => navigate(`/customers/${duplicateWarning.createdId}`)}
                  >
                    View Created Customer
                  </Button>
                )}
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => setDuplicateWarning(null)}
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </div>
          <button
            type="button"
            onClick={() => setDuplicateWarning(null)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1"
            aria-label="Dismiss warning"
          >
            <X className="size-4" />
          </button>
        </Alert>
      )}

      {/* Global API Error Alert */}
      {apiError && (
        <Alert variant="destructive" id="alert-api-error">
          <AlertTriangle className="size-4" />
          <AlertTitle>Operation Failed</AlertTitle>
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">
            {isEditing ? 'Edit Customer Details' : 'New Customer Intake'}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? 'Update contact details and tailor notes for this customer.'
              : 'Add a new client to the boutique directory.'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Customer Name */}
            <div className="space-y-1.5">
              <Label htmlFor="customer-name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customer-name"
                name="name"
                placeholder="e.g. Siti Rahmawati"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                disabled={submitting}
                aria-invalid={Boolean(errors.name)}
                autoFocus={!isEditing}
              />
              {errors.name && (
                <p className="text-xs text-destructive" id="error-customer-name">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Phone & Email (Responsive 1 or 2 cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="customer-phone">Phone / WhatsApp</Label>
                <Input
                  id="customer-phone"
                  name="phone"
                  type="tel"
                  placeholder="e.g. 081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customer-email">Email Address</Label>
                <Input
                  id="customer-email"
                  name="email"
                  type="email"
                  placeholder="e.g. siti@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  disabled={submitting}
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && (
                  <p className="text-xs text-destructive" id="error-customer-email">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="customer-address">Mailing / Delivery Address</Label>
              <Textarea
                id="customer-address"
                name="address"
                placeholder="e.g. Jl. Anggrek No. 12, RT 03 / RW 05, Jakarta Selatan"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="customer-notes">Internal Tailor Notes</Label>
              <Textarea
                id="customer-notes"
                name="notes"
                placeholder="e.g. Prefers slim fit, sensitive skin (no rough inner seams), VIP client."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel || (() => navigate('/customers'))}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              id="btn-submit-customer"
              className="w-full sm:w-auto"
            >
              {submitting && <Loader2 className="size-4 animate-spin mr-1.5" />}
              {submitting
                ? 'Saving...'
                : isEditing
                ? 'Update Customer'
                : 'Save Customer'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
