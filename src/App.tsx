import { createBrowserRouter, RouterProvider } from "react-router-dom";
import {
  Layout,
  LoadingScreen,
  ProtectedRoute,
  AuthProvider,
  HomePage,
  ArticlePage,
  PolicyPage,
  GuidePage,
  SampleArticlePage,
  KakaoCallbackPage,
} from "./shared";
import { AuthPage } from "./features/auth";
import { AdminPage } from "./features/admin";
import { ProfilePage } from "./features/profile";
import { PaymentPage, PaymentResultPage } from "./features/payment";
import { CommunityPage, NewTopicPage, TopicDetailPage } from "./features/community";
import { ShadowPage } from "./features/shadow";
import { LibraryPage } from "./features/library";
import { MeetupPage, EventDetailPage } from "./features/meetup";
import styled, { createGlobalStyle } from "styled-components";
import reset from "styled-reset";
import { useEffect, useState } from "react";
import { auth } from "./firebase";

// Create the router with the AppContent component
const router = createBrowserRouter([
  {
    path: "",
    element: <HomePage />,
  },
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "policy/:type",
        element: <PolicyPage />,
      },
      // Add the new public routes
      {
        path: "meetup",
        element: <MeetupPage />,
      },
      {
        path: "meetup/:eventId",
        element: <EventDetailPage />,
      },
      {
        path: "guide",
        element: <GuidePage />,
      },
      {
        path: "community",
        element: <CommunityPage />,
      },
      {
        path: "community/topic/:topicId",
        element: <TopicDetailPage />,
      },
      // Add the payment result page to the public routes
      {
        path: "payment-result",
        element: <PaymentResultPage />,
      },
      // Add the new sample route
      {
        path: "sample",
        element: <SampleArticlePage />,
      },
      // Add the new shadow route
      {
        path: "shadow",
        element: <ShadowPage />,
      },
      {
        path: "library",
        element: <LibraryPage />,
      },
      {
        path: "payment",
        element: <PaymentPage />,
      },
    ],
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "article/:articleId",
        element: <ArticlePage />,
      },
      {
        path: "admin",
        element: <AdminPage />,
      },
      {
        path: "community/new-topic",
        element: <NewTopicPage />,
      },
      // Redirect old subscription path to profile
      {
        path: "subscription",
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/kakao_callback",
    element: <KakaoCallbackPage />,
  },
]);

const GlobalStyles = createGlobalStyle`
  ${reset};
  * {
    box-sizing: border-box;
  }
  html {
    -webkit-text-size-adjust: 100%; /* Prevent font scaling in landscape */
  }
  body {
    background-color: white;
    color: black;
    font-family: 'Avenir', 'Avenir Next', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    overflow-x: hidden; /* Prevent horizontal scrolling at the page level */
    position: relative; /* Establish a stacking context */
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  #root {
    width: 100%;
    height: 100%;
    overflow-x: hidden;
  }
  
  /* Ensure buttons and interactive elements can escape parent bounds */
  button {
    position: relative;
    z-index: auto;
  }
  
  /* Add standard heading styles with Avenir */
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Avenir', 'Avenir Next', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-weight: 600;
  }
  
  /* Quick reading highlight style */
  .highlighted {
    color: #1A0F0A;
    font-weight: 800;
  }
  
  /* Additional mobile optimizations */
  @media (max-width: 768px) {
    html, body {
      position: fixed;
      overflow: hidden;
      width: 100vw;
      height: 100%;
    }
    
    #root {
      overflow-y: auto;
      height: 100%;
      -webkit-overflow-scrolling: touch;
    }
  }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100vh;
  width: 420px;
  padding: 50px 0px;
  margin: 0 auto;

  @media (max-width: 768px) {
    width: 90%;
    max-width: 420px;
    padding: 30px 0px;
  }
`;

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const init = async () => {
    // wait for firebase
    await auth.authStateReady();
    setIsLoading(false);
  };
  useEffect(() => {
    init();
  }, []);
  return (
    <AuthProvider>
      <GlobalStyles />
      {isLoading ? (
        <Wrapper>
          <LoadingScreen />
        </Wrapper>
      ) : (
        <RouterProvider router={router} />
      )}
    </AuthProvider>
  );
}

export default App;
