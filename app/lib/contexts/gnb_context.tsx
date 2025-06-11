"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface GnbContextProps {
  isTransparent: boolean;
  setIsTransparent: (transparent: boolean) => void;
}

const GnbContext = createContext<GnbContextProps>({
  isTransparent: false,
  setIsTransparent: () => {},
});

export const useGnb = () => useContext(GnbContext);

interface GnbProviderProps {
  children: ReactNode;
}

export const GnbProvider: React.FC<GnbProviderProps> = ({ children }) => {
  const [isTransparent, setIsTransparent] = useState(false);

  const value = {
    isTransparent,
    setIsTransparent,
  };

  return <GnbContext.Provider value={value}>{children}</GnbContext.Provider>;
};

export default GnbProvider;
