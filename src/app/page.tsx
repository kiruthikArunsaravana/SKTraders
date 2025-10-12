'use client';

import Image from 'next/image';
import { placeholderImages } from '@/lib/placeholder-images.json';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function LoginPage() {
  const loginBg = placeholderImages.find((p) => p.id === 'login-background');
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth(); // This can be null initially
  const [isPending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Login Service Unavailable",
            description: "The authentication service is not ready. Please wait a moment and try again."
        });
        return;
    }

    setPending(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Email and password are required.',
      });
      setPending(false);
      return;
    }

    try {
      // First, try to sign in.
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Login Successful',
        description: 'Redirecting to dashboard...',
      });
      router.push('/dashboard');
    } catch (error: any) {
      // If sign-in fails because the user is not found, try to create the user.
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          toast({
            title: 'Admin Account Created',
            description: 'Your admin account has been created. Welcome!',
          });
           router.push('/dashboard');
        } catch (creationError: any) {
            // Handle errors during creation (e.g. weak password)
            let errorMessage = creationError.message || 'An unknown error occurred during account creation.';
            toast({
                variant: 'destructive',
                title: 'Account Creation Failed',
                description: errorMessage,
            });
        }
      } else {
         // Handle other sign-in errors (wrong password, etc.)
        let errorMessage = 'An unknown error occurred.';
         if (error.code) {
            switch (error.code) {
                case 'auth/wrong-password':
                    errorMessage = 'Invalid password. Please try again.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
                    break;
                default:
                    errorMessage = error.message;
                    break;
            }
        }
        toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: errorMessage,
        });
      }
    } finally {
        setPending(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center relative bg-background">
      {loginBg && (
        <Image
          src={loginBg.imageUrl}
          alt={loginBg.description}
          data-ai-hint={loginBg.imageHint}
          fill
          className="object-cover"
        />
      )}
      <div className="absolute inset-0 bg-primary/70 backdrop-blur-sm" />

      <Card className="w-full max-w-md z-10 mx-4">
        <CardHeader className="text-center">
          <h1 className="text-4xl font-headline text-primary-foreground/90 drop-shadow-sm">
            HuskTrack
          </h1>
          <CardDescription className="text-primary-foreground/70">
            Sign in to your SK Traders account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@example.com"
                  required
                  className="pl-10"
                  defaultValue="admin@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="pl-10"
                  defaultValue="SecureP@ss123"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isPending || !auth}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
          <div className="mt-4 text-xs text-center text-muted-foreground">
            <p>Use default credentials. An admin account will be created on first login.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
