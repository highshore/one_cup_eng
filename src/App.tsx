import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/layout";
import Home from "./routes/home.tsx";
import Profile from "./routes/profile.tsx";

import Article from "./routes/article.tsx";
import Admin from "./routes/admin.tsx";
import Auth from "./routes/auth.tsx";
import styled, { createGlobalStyle } from "styled-components";
import reset from "styled-reset";
import { useEffect, useState } from "react";
import LoadingScreen from "./components/loading_screen";
import { auth } from "./firebase";
// import ProtectedRoute from "./components/protected_route";
import AuthLayout from "./components/auth_components.tsx";
import Policy from "./routes/policy";
import ProtectedRoute from "./components/protected_route.tsx";
import AuthProvider from "./contexts/AuthContext";
import Payment from "./routes/payment.tsx";

// Create the router with the AppContent component
const router = createBrowserRouter([
  {
    path: "",
    element: <Home />,
  },
  {
    path: "/",
    element: (
      <Layout />
    ),
    children: [
      {
        path: "policy/:type",
        element: <Policy />,
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
        element: <Profile />,
      },
      {
        path: "article/:articleId",
        element: <Article />,
      },
      {
        path: "admin",
        element: <Admin />,
      },
    ],
  },
  {
    path: "/auth",
    element: (
      <AuthLayout>
        <Auth />
      </AuthLayout>
    ),
  },
  {
    path: "/payment",
    element: <Layout />,
    children: [
      {
        path: "",
        element: <Payment />,
      },
    ],
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
