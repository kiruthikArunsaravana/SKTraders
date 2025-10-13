
'use client';

import { useState, FormEvent, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { placeholderImages } from '@/lib/placeholder-images.json';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  const background = placeholderImages.find(p => p.id === 'login-background');

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!auth) {
      toast({
        variant: "destructive",
        title: "Authentication service not ready.",
        description: "Please wait a moment and try again.",
      });
      return;
    }
     if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password Too Short",
        description: "Your password must be at least 6 characters long.",
      });
      return;
    }

    setIsSigningUp(true);

    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {
        toast({
          title: 'Account Created',
          description: 'Redirecting you to the dashboard...',
        });
        // The useEffect hook will handle the redirect
      })
      .catch((error: any) => {
        toast({
          variant: "destructive",
          title: "Sign Up Failed",
          description: error.code === 'auth/email-already-in-use' 
            ? 'This email is already in use. Try logging in.' 
            : error.message || "An unknown error occurred.",
        });
        setIsSigningUp(false);
      });
  };
  
  if (isUserLoading || user) {
     return (
      <div className="w-screen h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
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
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold font-headline">Create an Account</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email and password to sign up.
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
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
                  placeholder="Must be at least 6 characters"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSigningUp}>
                {isSigningUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign Up'}
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/" className="underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
