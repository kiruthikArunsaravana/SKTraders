'use server';

import {
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

// Default admin credentials (should match what's in the client-side providers)
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'SecureP@ss123';

/**
 * Server-side validation for admin credentials.
 * This action does not perform the sign-in itself. It only verifies that the
 * provided credentials match the expected admin credentials. The actual
 * sign-in is handled on the client-side by the Firebase SDK, which is the
 * standard and more reliable method.
 */
export async function handleSignIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  // Simply check if the credentials match the expected admin credentials.
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    // Return success to indicate the client can proceed with the sign-in attempt.
    return { success: true };
  } else {
    return { success: false, error: 'Invalid admin credentials.' };
  }
}
