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
import { KeyRound, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  changeOwnPassword,
  resetUserPassword,
  type UserDto,
} from '../api/users.api.ts';

export type ChangePasswordMode = 'self' | 'admin-reset';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ChangePasswordMode;
  targetUser?: UserDto | null;
  onSuccess?: () => void;
}

export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  open,
  onOpenChange,
  mode,
  targetUser,
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(null);
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
    setSuccessMessage(null);

    if (mode === 'self' && !currentPassword) {
      setError('Please enter your current password.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      setLoading(true);

      if (mode === 'self') {
        const res = await changeOwnPassword(currentPassword, newPassword);
        setSuccessMessage(res.message || 'Password changed successfully.');
      } else if (mode === 'admin-reset' && targetUser) {
        const res = await resetUserPassword(targetUser.id, newPassword);
        setSuccessMessage(res.message || `Password reset for ${targetUser.name}.`);
      }

      setTimeout(() => {
        resetForm();
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      }, 1200);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update password. Please check your inputs.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isSelf = mode === 'self';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <KeyRound className="size-4 text-primary" />
              {isSelf ? 'Change Your Password' : `Reset Password: ${targetUser?.name || 'User'}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isSelf
                ? 'Enter your current password followed by your new password to update your credentials.'
                : `Set a new password for ${targetUser?.name} (${targetUser?.role}). They will use this to sign in.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-xs">
            {error && (
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertCircle className="size-3.5" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="py-2 text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {isSelf && (
              <div className="space-y-1.5">
                <Label htmlFor="input-current-password" className="text-xs font-medium">
                  Current Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="input-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  disabled={loading || Boolean(successMessage)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="input-new-password" className="text-xs font-medium">
                New Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="input-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
                disabled={loading || Boolean(successMessage)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="input-confirm-password" className="text-xs font-medium">
                Confirm New Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="input-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                minLength={8}
                disabled={loading || Boolean(successMessage)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={loading || Boolean(successMessage)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              id="btn-submit-change-password"
              size="sm"
              disabled={loading || Boolean(successMessage)}
              className="text-xs h-8 gap-1.5"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <KeyRound className="size-3.5" />
              )}
              <span>{isSelf ? 'Change Password' : 'Reset Password'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
