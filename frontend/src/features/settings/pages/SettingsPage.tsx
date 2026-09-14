import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  FileText,
  Save,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../../app/AuthContext.tsx';
import {
  getStoreSettings,
  updateStoreSettings,
  type StoreSettings,
} from '../api/settings.api.ts';

export const SettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const isOwner = currentUser?.role === 'owner';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    address: '',
    phone: '',
    whatsappPhone: '',
    email: '',
    receiptFooter: '',
  });

  const [initialData, setInitialData] = useState<StoreSettings | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStoreSettings();
      setInitialData(data);
      setFormData({
        name: data.name || '',
        tagline: data.tagline || '',
        address: data.address || '',
        phone: data.phone || '',
        whatsappPhone: data.whatsappPhone || '',
        email: data.email || '',
        receiptFooter: data.receiptFooter || '',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load boutique settings';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSuccessMessage(null);
    setError(null);
  };

  const handleReset = () => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        tagline: initialData.tagline || '',
        address: initialData.address || '',
        phone: initialData.phone || '',
        whatsappPhone: initialData.whatsappPhone || '',
        email: initialData.email || '',
        receiptFooter: initialData.receiptFooter || '',
      });
      setSuccessMessage(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    if (!formData.name.trim()) {
      setError('Boutique name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const updated = await updateStoreSettings({
        name: formData.name.trim(),
        tagline: formData.tagline.trim() || null,
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        whatsappPhone: formData.whatsappPhone.trim() || null,
        email: formData.email.trim() || null,
        receiptFooter: formData.receiptFooter.trim() || null,
      });

      setInitialData(updated);
      setFormData({
        name: updated.name || '',
        tagline: updated.tagline || '',
        address: updated.address || '',
        phone: updated.phone || '',
        whatsappPhone: updated.whatsappPhone || '',
        email: updated.email || '',
        receiptFooter: updated.receiptFooter || '',
      });
      setSuccessMessage('Boutique settings successfully updated.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save store settings.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading boutique settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Role Banner for Staff */}
      {!isOwner && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="font-semibold">Read-only View</AlertTitle>
          <AlertDescription className="text-xs">
            Only users with the <strong>Owner</strong> role can update boutique configuration. You can view the current settings below.
          </AlertDescription>
        </Alert>
      )}

      {/* Success / Error Feedback */}
      {successMessage && (
        <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="font-semibold">Changes Saved</AlertTitle>
          <AlertDescription className="text-xs">{successMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle className="font-semibold">Error</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Boutique Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-primary" />
                <CardTitle className="text-lg">Boutique Profile</CardTitle>
              </div>
              {initialData?.updatedAt && (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                  Last updated: {new Date(initialData.updatedAt).toLocaleDateString()}
                </Badge>
              )}
            </div>
            <CardDescription>
              Primary branding details displayed on customer receipts, invoices, and communication templates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="input-settings-name">
                Boutique Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="input-settings-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!isOwner || saving}
                placeholder="e.g. JahitFlow Haute Couture"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="input-settings-tagline">Tagline / Slogan</Label>
              <Input
                id="input-settings-tagline"
                name="tagline"
                value={formData.tagline}
                onChange={handleChange}
                disabled={!isOwner || saving}
                placeholder="e.g. Jasa Jahit & Busana Butik Profesional"
              />
              <p className="text-[11px] text-muted-foreground">
                Subtitle that appears directly underneath the boutique name on printed receipts.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Communications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="size-5 text-primary" />
              <CardTitle className="text-lg">Contact & Communications</CardTitle>
            </div>
            <CardDescription>
              Public contact channels used for customer support and automated WhatsApp messaging.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="input-settings-phone" className="flex items-center gap-1.5">
                  <Phone className="size-3.5 text-muted-foreground" />
                  Display Phone Number
                </Label>
                <Input
                  id="input-settings-phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!isOwner || saving}
                  placeholder="e.g. +62 812-3456-7890"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="input-settings-whatsapp" className="flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-muted-foreground" />
                  WhatsApp Phone
                </Label>
                <Input
                  id="input-settings-whatsapp"
                  name="whatsappPhone"
                  value={formData.whatsappPhone}
                  onChange={handleChange}
                  disabled={!isOwner || saving}
                  placeholder="e.g. 6281234567890"
                />
                <p className="text-[11px] text-muted-foreground">
                  Number for WhatsApp click-to-chat links (digits only recommended, e.g. 6281...).
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="input-settings-email" className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground" />
                Contact Email
              </Label>
              <Input
                id="input-settings-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!isOwner || saving}
                placeholder="e.g. contact@jahitflow.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="input-settings-address" className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-muted-foreground" />
                Physical Address
              </Label>
              <Textarea
                id="input-settings-address"
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                disabled={!isOwner || saving}
                placeholder="e.g. Jl. Mode No. 123, Kebayoran Baru, Jakarta Selatan"
              />
            </div>
          </CardContent>
        </Card>

        {/* Receipt Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              <CardTitle className="text-lg">Receipt & Print Output</CardTitle>
            </div>
            <CardDescription>
              Configure text and terms that appear at the bottom of customer receipts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="input-settings-receipt-footer">Receipt Footer Note</Label>
              <Textarea
                id="input-settings-receipt-footer"
                name="receiptFooter"
                rows={3}
                value={formData.receiptFooter}
                onChange={handleChange}
                disabled={!isOwner || saving}
                placeholder="e.g. Terima kasih atas kepercayaan Anda mempercayakan busana impian kepada butik kami."
              />
              <p className="text-[11px] text-muted-foreground">
                Appears at the bottom of order receipts and fitting summary slips.
              </p>
            </div>
          </CardContent>
          {isOwner && (
            <CardFooter className="flex items-center justify-between border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={saving}
                id="btn-settings-reset"
              >
                <RotateCw className="mr-2 size-4" />
                Reset Changes
              </Button>
              <Button
                type="submit"
                disabled={saving}
                id="btn-settings-save"
                className="min-w-[120px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      </form>
    </div>
  );
};
