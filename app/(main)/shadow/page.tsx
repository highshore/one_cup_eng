import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shadow Learning | OneCup English",
  description:
    "Practice shadowing technique for English pronunciation and listening skills",
};

export default function ShadowPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Shadow Learning
        </h1>
        <p className="text-gray-600 mb-4">Coming Soon!</p>
        <p className="text-sm text-gray-500">
          Advanced pronunciation training features will be available soon.
        </p>
      </div>
    </div>
  );
}
