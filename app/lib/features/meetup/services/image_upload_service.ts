import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "../../../firebase/firebase";

// Generate unique filename for uploaded images
const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split(".").pop() || "jpg";
  return `${timestamp}_${randomId}.${extension}`;
};

// Upload a single image to Firebase Storage
export const uploadMeetupImage = async (file: File): Promise<string> => {
  try {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Only JPEG, PNG, and WebP images are allowed");
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("Image size must be less than 5MB");
    }

    // Generate unique filename
    const filename = generateUniqueFilename(file.name);

    // Create storage reference
    const storageRef = ref(storage, `meetup/${filename}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log("Image uploaded successfully:", downloadURL);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

// Upload multiple images
export const uploadMeetupImages = async (files: File[]): Promise<string[]> => {
  try {
    const uploadPromises = files.map(async (file) => {
      return uploadMeetupImage(file);
    });

    const downloadURLs = await Promise.all(uploadPromises);
    return downloadURLs;
  } catch (error) {
    console.error("Error uploading multiple images:", error);
    throw error;
  }
};

// Delete an image from Firebase Storage
export const deleteMeetupImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract the file path from the download URL
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);

    if (!pathMatch) {
      throw new Error("Invalid Firebase Storage URL");
    }

    const filePath = decodeURIComponent(pathMatch[1]);
    const storageRef = ref(storage, filePath);

    await deleteObject(storageRef);
    console.log("Image deleted successfully:", imageUrl);
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
};

// Utility function to validate image files
export const validateImageFiles = (
  files: FileList | File[]
): { valid: File[]; errors: string[] } => {
  const valid: File[] = [];
  const errors: string[] = [];

  const fileArray = Array.from(files);
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  fileArray.forEach((file, index) => {
    if (!allowedTypes.includes(file.type)) {
      errors.push(
        `File ${index + 1}: Only JPEG, PNG, and WebP images are allowed`
      );
      return;
    }

    if (file.size > maxSize) {
      errors.push(`File ${index + 1}: Image size must be less than 5MB`);
      return;
    }

    valid.push(file);
  });

  return { valid, errors };
};
