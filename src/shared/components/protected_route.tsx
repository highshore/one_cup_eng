import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/auth_context";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/auth" />;
}
