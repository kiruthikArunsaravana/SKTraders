// When deploying to Vercel, you need to set these environment variables.
// See: https://vercel.com/docs/projects/environment-variables

// This configuration is now correctly structured to be read by the Firebase SDK.
// It will be populated by the environment variables you set in Vercel.

const requiredEnvVars = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

// Check if all required environment variables are present
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    // This error will be thrown during the build process on the server if a variable is missing,
    // or in the browser console if it's a client-side issue.
    throw new Error(
      `Firebase config error: Missing required environment variable NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}. Please set it in your Vercel project settings.`
    );
  }
}

export const firebaseConfig = requiredEnvVars;
