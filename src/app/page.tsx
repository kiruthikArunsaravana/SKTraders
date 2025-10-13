
'use client';

import { useState, FormEvent, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { placeholderImages } from '@/lib/placeholder-images.json';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('SecureP@ss123');
  const [isSigningIn, setIsSigningIn] = useState(false);

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

    setIsSigningIn(true);

    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        // Successful sign-in is handled by the useUser hook and useEffect.
        // We can show a toast here if desired.
        toast({
          title: 'Login Successful',
          description: 'Redirecting you to the dashboard...',
        });
      })
      .catch((signInError: any) => {
        if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
          // If user doesn't exist, try creating a new account.
          createUserWithEmailAndPassword(auth, email, password)
            .then(() => {
              toast({
                title: 'Account Created & Logged In',
                description: 'Redirecting you to the dashboard...',
              });
            })
            .catch((signUpError: any) => {
              toast({
                variant: "destructive",
                title: "Sign Up Failed",
                description: signUpError.message || "Could not create your account.",
              });
              setIsSigningIn(false); // Stop loading on final failure.
            });
        } else {
          // Handle other sign-in errors (wrong password, etc.)
          toast({
            variant: "destructive",
            title: "Login Failed",
            description: signInError.message || "An unknown error occurred.",
          });
          setIsSigningIn(false); // Stop loading on final failure.
        }
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
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold font-headline">HuskTrack Login</h1>
            <p className="text-balance text-muted-foreground">
              Enter your credentials to access the SK Traders dashboard.
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
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
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSigningIn}>
                {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign In'}
              </Button>
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
