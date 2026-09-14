import React, { useState, useEffect } from 'react';
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
import { UserCog, Loader2, AlertCircle, Shield, User } from 'lucide-react';
import { updateUser, type UserDto } from '../api/users.api.ts';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserDto | null;
  onSuccess: (updated: UserDto) => void;
}

export const EditUserDialog: React.FC<EditUserDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'owner' | 'staff'>('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setRole(user.role === 'owner' ? 'owner' : 'staff');
      setError(null);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    if (!name.trim()) {
      setError('Please enter a user name.');
      return;
    }

    try {
      setLoading(true);
      const updated = await updateUser(user.id, {
        name: name.trim(),
        email: email.trim() ? email.trim().toLowerCase() : '',
        phone: phone.trim() ? phone.trim() : '',
        role,
      });

      onOpenChange(false);
      onSuccess(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user profile';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <UserCog className="size-4 text-primary" />
              Edit User Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify account details, contact information, and permission role.
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
              <Label htmlFor="input-edit-user-name" className="text-xs font-medium">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="input-edit-user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="input-edit-user-email" className="text-xs font-medium">
                Email Address
              </Label>
              <Input
                id="input-edit-user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@jahitflow.com"
                disabled={loading}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="input-edit-user-phone" className="text-xs font-medium">
                Phone Number
              </Label>
              <Input
                id="input-edit-user-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="081234567890"
                disabled={loading}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Role</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-edit-role-staff"
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
                    <div className="text-[10px] text-muted-foreground">Boutique operator</div>
                  </div>
                </button>

                <button
                  type="button"
                  id="btn-edit-role-owner"
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
                    <div className="text-[10px] text-muted-foreground">Admin privileges</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              id="btn-submit-edit-user"
              size="sm"
              disabled={loading}
              className="text-xs h-8 gap-1.5"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              <span>Save Changes</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
