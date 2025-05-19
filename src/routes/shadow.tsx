import React, { useState, useEffect } from "react";
import styled from "styled-components";
import {
  getAuthUrl,
  getAccessToken,
  setAccessToken,
  hasValidAccessToken,
  OAUTH_CONFIG,
} from "../utils/google_oauth";
import { firebaseConfig } from "../firebase";

const ShadowContainer = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const InputContainer = styled.div`
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
`;

const StyledInput = styled.input`
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 300px;
`;

const StyledButton = styled.button`
  padding: 10px 15px;
  font-size: 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #0056b3;
  }
`;

const VideoContainer = styled.div`
  margin-bottom: 20px;
  width: 100%;
  max-width: 640px;
`;

const TranscriptContainer = styled.div`
  width: 100%;
  max-width: 640px;
  border: 1px solid #eee;
  padding: 15px;
  background-color: #f9f9f9;
  white-space: pre-wrap; // To respect newlines in transcript
  text-align: left;
  max-height: 400px;
  overflow-y: auto;
`;

const YouTubeEmbed = ({ videoId }: { videoId: string }) => {
  if (!videoId) return null;
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  return (
    <iframe
      width="100%"
      height="360"
      src={embedUrl}
      title="YouTube video player"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    ></iframe>
  );
};

// Function to parse SRT content to plain text
/* // Commenting out parseSRT as the new proxy returns plain text
const parseSRT = (srtContent: string): string => {
  if (!srtContent) return "No transcript content found after parsing.";
  // Remove timestamps and sequence numbers
  const textOnly = srtContent
    .split(/\r?\n/)
    .filter(
      (line) =>
        !line.match(/^\d+$/) &&
        !line.match(/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/) &&
        line.trim() !== ""
    )
    .join(" "); // Join lines with a space for readability, can be adjusted
  return textOnly || "Could not parse transcript content.";
};
*/

const ShadowPage: React.FC = () => {
  const [youtubeLink, setYoutubeLink] = useState("");
  const [videoId, setVideoId] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Use projectId from firebaseConfig
  const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
  const CLOUD_FUNCTION_REGION = "asia-northeast3";
  const CLOUD_FUNCTION_NAME = "fetchYouTubeTranscriptProxy";

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code && !hasValidAccessToken()) {
      // Process only if no token yet to avoid loop on error
      window.history.replaceState({}, document.title, window.location.pathname);
      exchangeCodeForToken(code);
    } else {
      setIsAuthenticated(hasValidAccessToken());
    }
  }, []);

  const exchangeCodeForToken = async (code: string) => {
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
          redirect_uri: OAUTH_CONFIG.redirectUri, // Using OAUTH_CONFIG from oauth.ts
          grant_type: "authorization_code",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to exchange code for token: ${
            errorData.error_description || response.statusText
          }`
        );
      }

      const data = await response.json();
      setAccessToken(data.access_token);
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error("Error exchanging code for token:", error);
      setTranscript(
        `Failed to authenticate with YouTube: ${error.message}. Please try authenticating again.`
      );
      setIsAuthenticated(false); // Ensure auth state is false on error
    }
  };

  const handleAuth = () => {
    window.location.href = getAuthUrl();
  };

  const handleSubmit = async () => {
    // console.log("[ShadowPage] handleSubmit CALLED. YouTube link input:", youtubeLink); // Keep this, it's fine

    setVideoId("");
    setTranscript("");
    setIsLoadingTranscript(true);

    if (!isAuthenticated) {
      setTranscript(
        "Please authenticate with YouTube first by clicking the button above."
      );
      setIsLoadingTranscript(false);
      return;
    }

    if (!FIREBASE_PROJECT_ID) {
      setTranscript(
        "Firebase Project ID could not be determined from firebaseConfig."
      );
      setIsLoadingTranscript(false);
      return;
    }

    const regex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = youtubeLink.match(regex);
    let extractedVideoId = "";

    if (match && match[1]) {
      extractedVideoId = match[1];
      setVideoId(extractedVideoId);
      // console.log("[ShadowPage] Video ID extracted by regex:", extractedVideoId);
      alert(`[DEBUG] Video ID extracted by regex: ${extractedVideoId}`); // DEBUG ALERT 1
    } else {
      alert(
        "Invalid YouTube link. Please ensure it's a valid YouTube video URL."
      );
      setTranscript("Invalid YouTube link provided.");
      setVideoId("");
      setIsLoadingTranscript(false);
      return;
    }

    if (!extractedVideoId) {
      // console.error("[ShadowPage] extractedVideoId is empty after regex processing...");
      alert(
        "[DEBUG] extractedVideoId is EMPTY after regex processing. This should not happen!"
      ); // DEBUG ALERT 2
      setTranscript("Failed to extract video ID from the link.");
      setIsLoadingTranscript(false);
      return;
    }

    const userAccessToken = getAccessToken();
    if (!userAccessToken) {
      setTranscript(
        "Authentication token is missing. Please authenticate again."
      );
      setIsAuthenticated(false);
      setIsLoadingTranscript(false);
      return;
    }

    try {
      const captionsListUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${extractedVideoId}`;
      const captionsResponse = await fetch(captionsListUrl, {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      if (!captionsResponse.ok) {
        const errorData = await captionsResponse.json();
        throw new Error(
          errorData?.error?.message ||
            `Error fetching caption list: ${captionsResponse.status}`
        );
      }
      const captionsData = await captionsResponse.json();
      const englishCaptionAvailable = captionsData.items?.some(
        (item: any) =>
          item.snippet?.language === "en" ||
          item.snippet?.language?.startsWith("en-")
      );
      // console.log("[ShadowPage] English captions available?", englishCaptionAvailable, "using videoId:", extractedVideoId);

      if (englishCaptionAvailable) {
        const proxyUrl = `https://${CLOUD_FUNCTION_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/${CLOUD_FUNCTION_NAME}`;
        // console.log("[ShadowPage] Attempting to fetch transcript. Video ID being sent to proxy:", extractedVideoId);
        alert(`[DEBUG] Calling proxy with videoId: ${extractedVideoId}`); // DEBUG ALERT 3

        const transcriptResponse = await fetch(proxyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            videoId: extractedVideoId,
          }),
        });

        if (!transcriptResponse.ok) {
          const errorText = await transcriptResponse.text();
          throw new Error(
            `Error fetching transcript via proxy: ${transcriptResponse.status} - ${errorText}`
          );
        }

        const transcriptContent = await transcriptResponse.text();
        if (!transcriptContent) {
          throw new Error("Fetched transcript content was empty from proxy.");
        }
        setTranscript(transcriptContent);
      } else {
        setTranscript(
          "No English transcript track reported as available for this video by YouTube API."
        );
      }
    } catch (error: any) {
      console.error("Error fetching transcript process:", error);
      setTranscript(`Failed to load transcript: ${error.message}`);
      if (
        error.message.includes("token") ||
        error.message.includes("Authentication")
      ) {
        setIsAuthenticated(false);
      }
    }
    setIsLoadingTranscript(false);
  };

  return (
    <ShadowContainer>
      <h1>YouTube Video Analyzer</h1>

      {!isAuthenticated ? (
        <StyledButton onClick={handleAuth}>
          Authenticate with YouTube
        </StyledButton>
      ) : (
        <>
          <InputContainer>
            <StyledInput
              type="text"
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              placeholder="Paste YouTube video link here"
            />
            <StyledButton onClick={handleSubmit} disabled={isLoadingTranscript}>
              {isLoadingTranscript ? "Loading..." : "Submit"}
            </StyledButton>
          </InputContainer>

          {videoId && (
            <VideoContainer>
              <YouTubeEmbed videoId={videoId} />
            </VideoContainer>
          )}

          {isLoadingTranscript && <p>Loading transcript...</p>}

          {!isLoadingTranscript && transcript && (
            <TranscriptContainer>
              <h3>Transcript:</h3>
              <p>{transcript}</p>
            </TranscriptContainer>
          )}
        </>
      )}
    </ShadowContainer>
  );
};

export default ShadowPage;
