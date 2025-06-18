import Script from "next/script";

export default function AiTutorDemoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">AI Tutor Demo</h1>
      <div className="w-full max-w-md">
        {/* @ts-ignore */}
        <elevenlabs-convai agent-id="agent_01jxjm8kw9fr7bmjah9qdyzqv6"></elevenlabs-convai>
      </div>
      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        async
        strategy="afterInteractive"
      />
    </main>
  );
}
