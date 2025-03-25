import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

/**
 * Example of calling a callable Firebase Function
 * This corresponds to the 'sayHello' function we defined
 */
export const callSayHello = async (name: string) => {
  try {
    // Create a reference to the callable function
    const sayHelloFunction = httpsCallable(functions, 'sayHello');
    
    // Call the function and pass data
    const result = await sayHelloFunction({ name });
    
    // The returned data will be in result.data
    return result.data;
  } catch (error) {
    console.error("Error calling sayHello function:", error);
    throw error;
  }
};

/**
 * Example function that demonstrates how to access an HTTP function
 * This corresponds to the 'helloWorld' function we defined
 * 
 * Note: HTTP functions are typically accessed directly via their URL,
 * not through the Firebase SDK.
 */
export const getHelloWorldUrl = () => {
  // Replace this with your actual region and project ID
  const region = "us-central1"; // Default Firebase Functions region
  const projectId = "one-cup-eng"; // Your project ID from firebase.ts
  
  return `https://${region}-${projectId}.cloudfunctions.net/helloWorld`;
};

// Example of how you would call this in your components:
// 
// import { callSayHello, getHelloWorldUrl } from '../utils/functions';
//
// // To call the callable function:
// const handleCallFunction = async () => {
//   try {
//     const response = await callSayHello("Your Name");
//     console.log(response); // { message: "Hello, Your Name!" }
//   } catch (error) {
//     console.error("Error:", error);
//   }
// };
//
// // To use the HTTP function:
// const handleFetchHttp = async () => {
//   try {
//     const response = await fetch(getHelloWorldUrl());
//     const text = await response.text();
//     console.log(text); // "Hello from Firebase!"
//   } catch (error) {
//     console.error("Error:", error);
//   }
// }; 