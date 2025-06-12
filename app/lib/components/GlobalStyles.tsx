"use client";

import { createGlobalStyle } from "styled-components";
import reset from "styled-reset";

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
    body {
      /* Remove fixed positioning that prevents scrolling */
      -webkit-overflow-scrolling: touch;
    }
  }
`;

export default GlobalStyles;
