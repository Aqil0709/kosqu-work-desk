import React, { createContext, useContext } from 'react';

const PortalContext = createContext({ basePath: '/admin' });

export const PortalProvider = ({ basePath, children }) => (
  <PortalContext.Provider value={{ basePath }}>{children}</PortalContext.Provider>
);

export const usePortalBase = () => {
  const ctx = useContext(PortalContext);
  return ctx.basePath || '/admin';
};
