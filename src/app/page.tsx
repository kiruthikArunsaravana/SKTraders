'use client';

import Image from 'next/image';
import Link from 'next/link';
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
import { handleSignIn } from './actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

export default function LoginPage() {
  const loginBg = placeholderImages.find((p) => p.id === 'login-background');
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const { success, error } = await handleSignIn(formData);

    if (success) {
      toast({
        title: 'Login Successful',
        description: 'Welcome to HuskTrack.',
      });
      router.push('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error || 'An unknown error occurred.',
      });
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

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
          <div className="mt-4 text-xs text-center text-muted-foreground">
            <p>Use the default credentials. The password is "SecureP@ss123"</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
