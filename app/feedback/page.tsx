import FeedbackClient from "./FeedbackClient";

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const uid = (params.uid as string) || "anonymous";

  return <FeedbackClient uid={uid} />;
}
