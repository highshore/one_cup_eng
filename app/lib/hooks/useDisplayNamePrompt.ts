"use client";

import { useState, useEffect } from "react";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export function useDisplayNamePrompt() {
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (!user) {
        setShouldShowPrompt(false);
        setLoading(false);
        return;
      }

      try {
        // Check if user has displayName set and if they've been prompted before
        const hasDisplayName =
          user.displayName && user.displayName.trim() !== "";

        if (hasDisplayName) {
          setShouldShowPrompt(false);
          setLoading(false);
          return;
        }

        // Check Firestore to see if user has been prompted recently
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const hasBeenPrompted = userData.displayNamePrompted;
          const promptedAt = userData.displayNamePromptedAt?.toDate();

          // If prompted within last 7 days, don't show again
          if (hasBeenPrompted && promptedAt) {
            const daysSincePrompt =
              (Date.now() - promptedAt.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSincePrompt < 7) {
              setShouldShowPrompt(false);
              setLoading(false);
              return;
            }
          }
        }

        // Show prompt if user has no displayName and hasn't been prompted recently
        setShouldShowPrompt(true);
      } catch (error) {
        console.error("Error checking display name prompt status:", error);
        setShouldShowPrompt(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const hidePrompt = () => {
    setShouldShowPrompt(false);
  };

  return {
    shouldShowPrompt,
    hidePrompt,
    user,
    loading,
  };
}
