import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

interface AuthContextProps {
  currentUser: User | null;
  isLoading: boolean;
  hasActiveSubscription: boolean | null;
}

const AuthContext = createContext<AuthContextProps>({
  currentUser: null,
  isLoading: true,
  hasActiveSubscription: null,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setHasActiveSubscription(userData.hasActiveSubscription || false);
          } else {
            setHasActiveSubscription(false);
          }
        } catch (error) {
          console.error("Error fetching user subscription status:", error);
          setHasActiveSubscription(false);
        }
      } else {
        setHasActiveSubscription(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isLoading,
    hasActiveSubscription,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
