"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const UserContext = createContext({isAuth:null, setisAuth:null});

export const UserContextProvider = ({ children }) => {
  const [isAuth, setisAuth] = useState(null);
  useEffect(() => {
    const token = window.localStorage.getItem("token");
    if (token) {
      setisAuth(token);
    }
  }, []);
  return (
    <UserContext.Provider
      value={{
        isAuth,
        setisAuth,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const UserState = () => useContext(UserContext);
