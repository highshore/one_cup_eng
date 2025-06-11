import admin from "firebase-admin";
import path from "path";
import fs from "fs";

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

// More reliable build detection
const isVercelBuild = process.env.VERCEL === "1" && !process.env.VERCEL_ENV;

try {
  // Check if a Firebase app has already been initialized to prevent errors
  if (!admin.apps.length && !isVercelBuild) {
    let credential: admin.credential.Credential | null = null;

    // Try service account file first (for local development)
    if (typeof window === "undefined") {
      try {
        const serviceAccountPath = path.join(
          process.cwd(),
          "firebase_service_account.json"
        );

        if (fs.existsSync(serviceAccountPath)) {
          console.log(
            "Initializing Firebase Admin SDK with service account file"
          );
          credential = admin.credential.cert(serviceAccountPath);
        }
      } catch (error) {
        console.log(
          "Service account file not available, trying environment variables"
        );
      }
    }

    // Use environment variables (for Vercel deployment)
    if (!credential) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

      if (projectId && privateKey && clientEmail) {
        console.log(
          "Initializing Firebase Admin SDK with environment variables"
        );
        try {
          // Replace literal \n with actual newlines if needed
          const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");

          credential = admin.credential.cert({
            projectId,
            privateKey: formattedPrivateKey,
            clientEmail,
          });
        } catch (error) {
          console.error("Failed to create Firebase credential:", error);
        }
      } else {
        console.log(
          "Firebase environment variables not found - this is normal during build"
        );
      }
    }

    if (credential) {
      admin.initializeApp({
        credential,
        databaseURL: "https://one-cup-eng-default-rtdb.firebaseio.com/",
      });

      db = admin.firestore();
      auth = admin.auth();
    } else {
      console.log("Firebase Admin SDK not initialized - using mock objects");
      // Create mock objects that won't break during build
      db = {
        collection: () => ({
          where: () => ({
            get: () => Promise.resolve({ docs: [] }),
          }),
          doc: () => ({
            get: () => Promise.resolve({ exists: false, data: () => null }),
          }),
        }),
      } as any;
      auth = {} as admin.auth.Auth;
    }
  } else {
    if (isVercelBuild) {
      // For Vercel build time, create comprehensive mock objects
      db = {
        collection: () => ({
          where: () => ({
            get: () => Promise.resolve({ docs: [] }),
          }),
          doc: () => ({
            get: () => Promise.resolve({ exists: false, data: () => null }),
          }),
        }),
      } as any;
      auth = {} as admin.auth.Auth;
    } else {
      db = admin.firestore();
      auth = admin.auth();
    }
  }
} catch (error) {
  console.warn("Firebase Admin SDK initialization failed:", error);
  // Create comprehensive mock objects for build time
  db = {
    collection: () => ({
      where: () => ({
        get: () => Promise.resolve({ docs: [] }),
      }),
      doc: () => ({
        get: () => Promise.resolve({ exists: false, data: () => null }),
      }),
    }),
  } as any;
  auth = {} as admin.auth.Auth;
}

export { db, auth };
