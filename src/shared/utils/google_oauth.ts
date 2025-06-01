// OAuth 2.0 configuration
export const OAUTH_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
  redirectUri:
    import.meta.env.VITE_REDIRECT_URI || "http://localhost:5173/shadow",
  scopes: [
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/youtube.readonly",
  ].join(" "),
};

// Generate the OAuth URL
export const getAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.clientId,
    redirect_uri: OAUTH_CONFIG.redirectUri,
    response_type: "code",
    scope: OAUTH_CONFIG.scopes,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

// Store the access token in localStorage
export const setAccessToken = (token: string) => {
  localStorage.setItem("youtube_access_token", token);
};

// Get the stored access token
export const getAccessToken = () => {
  return localStorage.getItem("youtube_access_token");
};

// Clear the stored access token
export const clearAccessToken = () => {
  localStorage.removeItem("youtube_access_token");
};

// Check if we have a valid access token
export const hasValidAccessToken = () => {
  return !!getAccessToken();
};
