import { Metadata } from "next";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "Admin Panel - OneCup English",
  description: "Admin panel for managing users, articles, and messaging system",
};

export default function AdminPage() {
  return <AdminClient />;
}
