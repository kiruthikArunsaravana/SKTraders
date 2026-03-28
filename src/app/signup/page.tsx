'use client';

import { useState, FormEvent, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { placeholderImages } from '@/lib/placeholder-images.json';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  const background = placeholderImages.find((p) => p.id === 'login-background');

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSigningUp(true);

    try {
      if (password.length < 6) {
        toast({
          variant: 'destructive',
          title: 'Password Too Short',
          description: 'Your password must be at least 6 characters long.',
        });
        setIsSigningUp(false);
        return;
      }

      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (registerRes.ok) {
        toast({
          title: 'Account Created',
          description: 'Welcome! Redirecting you to the dashboard...',
        });
        window.location.href = '/dashboard';
        return;
      }

      const err = await registerRes.json();
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: err.error || 'Could not create account.',
      });
      setIsSigningUp(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Error',
        description: error.message || 'An unexpected error occurred.',
      });
      setIsSigningUp(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" suppressHydrationWarning />
      </div>
    );
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-4 text-center">
            <h1 className="text-3xl font-bold font-headline">Create your Account</h1>
            <p className="text-balance text-muted-foreground">
              Sign up to create a new SKTraders user account.
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSigningUp}>
                {isSigningUp ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" suppressHydrationWarning />
                ) : (
                  'Sign Up'
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/" className="underline underline-offset-4 hover:text-foreground">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        {background && (
          <Image
            src={background.imageUrl}
            alt="Coconut Husks"
            width="1920"
            height="1080"
            className="h-full w-full object-cover"
            data-ai-hint={background.imageHint}
          />
        )}
      </div>
    </div>
  );
}
