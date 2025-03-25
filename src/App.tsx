import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/layout";
import Home from "./routes/home.tsx";
import Profile from "./routes/profile.tsx";
import SignIn from "./routes/sign_in.tsx";
import SignUp from "./routes/sign_up.tsx";
import Article from "./routes/article.tsx";
import Admin from "./routes/admin.tsx";
import styled, { createGlobalStyle } from "styled-components";
import reset from "styled-reset";
import { useEffect, useState } from "react";
import LoadingScreen from "./components/loading_screen";
import { auth } from "./firebase";
// import ProtectedRoute from "./components/protected_route";
import AuthLayout from "./components/auth_components.tsx";

// Create the router with the AppContent component
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Layout />
      // Temporarily disable protected route
      // <ProtectedRoute>
      //   <Layout />
      // </ProtectedRoute>
    ),
    children: [
      { 
        path: "",  // Use index:true instead of path:"" for the default route
        element: <Home /> 
      },
      { 
        path: "profile", 
        element: <Profile /> 
      },
      {
        path: "article/:articleId",
        element: <Article />
      },
      {
        path: "admin",
        element: <Admin />
      },
    ],
  },
  {
    path: "/signin",
    element: (
      <AuthLayout>
        <SignIn />
      </AuthLayout>
    ),
  },
  {
    path: "/signup",
    element: (
      <AuthLayout>
        <SignUp />
      </AuthLayout>
    ),
  },
]);

const GlobalStyles = createGlobalStyle`
  ${reset};
  * {
    box-sizing: border-box;
  }
  body {
    background-color: white;
    color: black;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    overflow-x: hidden; /* Prevent horizontal scrolling at the page level */
    position: relative; /* Establish a stacking context */
  }
  
  /* Ensure buttons and interactive elements can escape parent bounds */
  button {
    position: relative;
    z-index: auto;
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
    <>
      <GlobalStyles />
      {isLoading ? (
        <Wrapper>
          <LoadingScreen />
        </Wrapper>
      ) : (
        <RouterProvider router={router} />
      )}
    </>
  );
}

export default App;
