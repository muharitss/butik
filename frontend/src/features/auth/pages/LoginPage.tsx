import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../app/AuthContext.tsx';
import { ApiClientError } from '../../../types/api.ts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, AlertCircle, Loader2, LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { currentUser, loading: authLoading, login } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectTarget = searchParams.get('redirect') || '/';

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (!authLoading && currentUser) {
      navigate(redirectTarget, { replace: true });
    }
  }, [currentUser, authLoading, navigate, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      await login({ email, password });
      navigate(redirectTarget, { replace: true });
    } catch (err: unknown) {
      // Inline error message; do not clear the password field (requirement TASK-033)
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'Invalid email or password');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected authentication error occurred');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex size-12 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Sparkles className="size-6" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            JahitFlow
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Boutique & Tailoring OS
          </p>
        </div>

        {/* Login Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Sign In
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter your boutique operator credentials to access the workspace
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} id="login-form">
            <CardContent className="space-y-4">
              {errorMessage && (
                <Alert variant="destructive" id="login-error-alert" className="py-2">
                  <AlertCircle className="size-4" />
                  <AlertDescription id="login-error-message" className="text-xs">
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  placeholder="operator@jahitflow.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="submit"
                id="btn-login-submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 size-4" />
                    Sign In
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
