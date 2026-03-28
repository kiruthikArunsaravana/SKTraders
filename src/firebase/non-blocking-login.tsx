'use client';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from '@/firebase/auth';

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(_authInstance: any, email: string, password: string): void {
  // Fire and forget
  createUserWithEmailAndPassword(undefined, email, password).catch(() => {});
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(_authInstance: any, email: string, password: string): void {
  // Fire and forget
  signInWithEmailAndPassword(undefined, email, password).catch(() => {});
}
