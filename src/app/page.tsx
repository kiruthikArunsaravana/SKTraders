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

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const background = placeholderImages.find(p => p.id === 'login-background');

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSigningIn(true);

    try {
      if (password.length < 6) {
        toast({
          variant: "destructive",
          title: "Password Too Short",
          description: "Your password must be at least 6 characters long.",
        });
        setIsSigningIn(false);
        return;
      }

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (loginRes.ok) {
        toast({
          title: 'Login Successful',
          description: 'Redirecting you to the dashboard...',
        });
        window.location.href = '/dashboard';
        return;
      }

      const err = await loginRes.json();
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: err.error || 'Invalid email or password.',
      });
      setIsSigningIn(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message || "An unexpected error occurred.",
      });
      setIsSigningIn(false);
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
            <h1 className="text-3xl font-bold font-headline">Login to your Account</h1>
            <p className="text-balance text-muted-foreground">
              Enter your credentials to access the SKTraders dashboard.
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
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSigningIn}>
                {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" suppressHydrationWarning /> : 'Sign In'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                New user?{' '}
                <Link href="/signup" className="underline underline-offset-4 hover:text-foreground">
                  Create an account
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
