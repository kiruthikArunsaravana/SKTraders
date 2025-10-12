import Image from "next/image";
import Link from "next/link";
import { placeholderImages } from "@/lib/placeholder-images.json";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const loginBg = placeholderImages.find(p => p.id === "login-background");

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
          <h1 className="text-4xl font-headline text-primary-foreground/90 drop-shadow-sm">HuskTrack</h1>
          <CardDescription className="text-primary-foreground/70">
            Sign in to your SK Traders account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input id="email" type="email" placeholder="name@example.com" required className="pl-10"/>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="#"
                  className="text-sm text-accent-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" required className="pl-10"/>
              </div>
            </div>
            <Link href="/dashboard" className="w-full">
              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </Link>
          </form>
          <div className="mt-6 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="#" className="underline text-accent-foreground">
              Contact Admin
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
