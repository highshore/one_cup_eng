import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth } from "../firebase/firebase";

export interface FeedbackData {
  userId: string;
  category: "cancellation" | "refund";
  reasons: string[];
  otherReason?: string;
  timestamp: any;
}

export const saveFeedback = async (
  category: "cancellation" | "refund",
  reasons: string[],
  otherReason?: string
): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const feedbackData: any = {
    userId: user.uid,
    category,
    reasons,
    timestamp: serverTimestamp(),
  };

  // Only add otherReason if it exists and is not empty
  if (otherReason && otherReason.trim() !== "") {
    feedbackData.otherReason = otherReason.trim();
  }

  try {
    await addDoc(collection(db, "feedback"), feedbackData);
    console.log("Feedback saved successfully");
  } catch (error) {
    console.error("Error saving feedback:", error);
    throw error;
  }
};
