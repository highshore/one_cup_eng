import { useState } from "react";
import styled from "styled-components";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getFirestore, setDoc } from "firebase/firestore";

const Button = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 10px 20px;
  border-radius: 50px;
  border: 1px solid #ddd;
  margin-bottom: 30px;
  background-color: white;
  color: black;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: #f5f5f5;
    border-color: #ccc;
  }

  svg {
    margin-right: 10px;
  }
`;

export default function GoogleBtn() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);

      // Create a user document if it doesn't exist
      const firestore = getFirestore();
      await setDoc(
        doc(firestore, `users/${userCredential.user.uid}`),
        {
          email: userCredential.user.email,
          name: userCredential.user.displayName,
          photo: userCredential.user.photoURL,
          createdAt: new Date(),
        },
        { merge: true }
      );

      navigate("/");
    } catch (error) {
      console.error("Google Sign-in Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={onClick} disabled={isLoading}>
      <svg
        width="18"
        height="18"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 488 512"
      >
        <path
          fill="#4285F4"
          d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
        ></path>
      </svg>
      {isLoading ? "Loading..." : "Continue with Google"}
    </Button>
  );
}
