import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Loader2, AlertCircle, Shield, User } from 'lucide-react';
import { createUser, type UserDto } from '../api/users.api.ts';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (user: UserDto) => void;
}

export const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'owner' | 'staff'>('staff');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setRole('staff');
    setTemporaryPassword('');
    setError(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter a user name.');
      return;
    }

    if (!temporaryPassword || temporaryPassword.length < 8) {
      setError('Temporary password must be at least 8 characters long.');
      return;
    }

    try {
      setLoading(true);
      const created = await createUser({
        name: name.trim(),
        email: email.trim() ? email.trim().toLowerCase() : undefined,
        phone: phone.trim() ? phone.trim() : undefined,
        role,
        temporaryPassword,
      });

      resetForm();
      onOpenChange(false);
      onSuccess(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create user account';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <UserPlus className="size-4 text-primary" />
              Add New User Account
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create an account for boutique tailors or operators with a temporary password.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-xs">
            {error && (
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertCircle className="size-3.5" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="input-create-user-name" className="text-xs font-medium">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="input-create-user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Siti Nurhaliza"
                required
                disabled={loading}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="input-create-user-email" className="text-xs font-medium">
                Email Address <span className="text-muted-foreground font-normal">(Login Identifier)</span>
              </Label>
              <Input
                id="input-create-user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. siti@jahitflow.com"
                disabled={loading}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Staff member will use this email address to sign in to JahitFlow.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="input-create-user-phone" className="text-xs font-medium">
                Phone Number
              </Label>
              <Input
                id="input-create-user-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 081234567890"
                disabled={loading}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Account Role</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-select-role-staff"
                  onClick={() => setRole('staff')}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    role === 'staff'
                      ? 'border-primary bg-primary/10 text-foreground font-medium ring-1 ring-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <User className="size-4 shrink-0 text-primary" />
                  <div>
                    <div className="text-xs font-medium">Staff</div>
                    <div className="text-[10px] text-muted-foreground">Orders, intake & fittings</div>
                  </div>
                </button>

                <button
                  type="button"
                  id="btn-select-role-owner"
                  onClick={() => setRole('owner')}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    role === 'owner'
                      ? 'border-primary bg-primary/10 text-foreground font-medium ring-1 ring-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Shield className="size-4 shrink-0 text-primary" />
                  <div>
                    <div className="text-xs font-medium">Owner</div>
                    <div className="text-[10px] text-muted-foreground">Full administrative control</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="input-create-user-password" className="text-xs font-medium">
                Temporary Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="input-create-user-password"
                type="password"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
                disabled={loading}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Staff member should update this password upon initial login.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              id="btn-submit-create-user"
              size="sm"
              disabled={loading}
              className="text-xs h-8 gap-1.5"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
              <span>Create Account</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
