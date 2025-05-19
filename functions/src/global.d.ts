declare module "node-fetch" {
  const fetch: any;
  export default fetch;
  export type RequestInfo = any;
  export type RequestInit = any;
  export type Response = any; // You might want to be more specific if you know the structure
}

declare module "youtube-transcript" {
  export class YoutubeTranscript {
    static fetchTranscript(
      videoId: string,
      config?: any
    ): Promise<Array<{ text: string; duration: number; offset: number }>>;
  }
  // If there are other exports or a default export, declare them as well.
  // For now, this covers the used static method.
}
