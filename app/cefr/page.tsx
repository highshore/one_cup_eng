import React from "react";
import CefrClient from "./CefrClient";

export const metadata = {
	title: "CEFR Classifier",
	description: "Classify words in text by CEFR levels and visualize distribution.",
};

export default function Page() {
	return <CefrClient />;
}


