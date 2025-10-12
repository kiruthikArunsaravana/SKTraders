'use server';

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { headers } from 'next/headers';
import { firebaseConfig } from '@/firebase/config';

// This file runs on the server, so we can use the Admin SDK for user creation if needed,
// but for simplicity, we'll use the client SDK with elevated privileges in this server environment.
// Ensure Firebase is initialized
function initializeServerApp() {
  if (getApps().some((app) => app.name === 'server-app')) {
    return getApp('server-app');
  }
  return initializeApp(firebaseConfig, 'server-app');
}

async function getAdminAuth() {
  const app = initializeServerApp();
  return getAuth(app);
}

// Default admin credentials (consider moving to environment variables)
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password';

/**
 * Ensures the default admin user exists in Firebase Auth.
 * If the user doesn't exist, it creates one.
 */
async function ensureAdminUserExists() {
  const auth = await getAdminAuth();
  try {
    // Try to sign in to check if user exists. This is a workaround since
    // fetching a user by email is an admin-only SDK feature which we are avoiding for simplicity.
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('Admin user already exists.');
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      // User doesn't exist, so create them
      console.log('Admin user not found. Creating a new one...');
      try {
        await createUserWithEmailAndPassword(
          auth,
          ADMIN_EMAIL,
          ADMIN_PASSWORD
        );
        console.log('Admin user created successfully.');
      } catch (createError) {
        console.error('Error creating admin user:', createError);
        throw new Error('Could not create admin user.');
      }
    } else {
      // Another error occurred during the sign-in check
      console.error('Error checking for admin user:', error);
      // We can ignore other errors for now, as the sign-in on the client will handle them.
    }
  }
}

export async function handleSignIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }
  
  // This is a server action. The actual sign-in happens on the client,
  // but we can prepare by ensuring the admin user exists.
  try {
    await ensureAdminUserExists();
    // We don't actually sign the user in here. We just prepare the backend.
    // The client will perform the actual sign-in. We return success to tell the client to proceed.
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
