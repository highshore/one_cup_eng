const admin = require('firebase-admin');

// Path to your service account key JSON file
// IMPORTANT: Make sure this path is correct and the file is secure
const serviceAccount = require('./firebase_service_account.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const firestore = admin.firestore();
const usersCollection = firestore.collection('users');

async function migrateAuthProfilesToFirestore() {
  console.log('Starting migration of Auth profiles to Firestore...');
  let migratedCount = 0;
  let errorCount = 0;
  let nextPageToken = undefined;

  try {
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      nextPageToken = listUsersResult.pageToken;
      const users = listUsersResult.users;

      if (users.length === 0) {
        console.log('No users found in Firebase Authentication to migrate.');
        break;
      }

      console.log(`Processing batch of ${users.length} users...`);

      for (const userRecord of users) {
        const { uid, displayName, photoURL, email } = userRecord;

        const profileData = {};
        if (displayName) {
          profileData.displayName = displayName;
        }
        if (photoURL) {
          profileData.photoURL = photoURL;
        }
        if (email) {
          profileData.email = email; // Optional: if you want to store email too
        }

        // Only proceed if there's actual data to migrate for this user
        if (Object.keys(profileData).length > 0) {
          try {
            // Using .set with { merge: true } will create the document if it doesn't exist,
            // or update it if it does, without overwriting other existing fields.
            await usersCollection.doc(uid).set(profileData, { merge: true });
            console.log(`Successfully migrated profile for UID: ${uid}`);
            migratedCount++;
          } catch (err) {
            console.error(`Error migrating profile for UID: ${uid}`, err);
            errorCount++;
          }
        } else {
          console.log(`Skipping UID: ${uid} as it has no displayName or photoURL in Auth.`);
        }
      }
    } while (nextPageToken);

    console.log('\nMigration completed!');
    console.log(`Successfully migrated profiles: ${migratedCount}`);
    console.log(`Failed migrations: ${errorCount}`);

  } catch (error) {
    console.error('An unexpected error occurred during migration:', error);
  }
}

migrateAuthProfilesToFirestore(); 