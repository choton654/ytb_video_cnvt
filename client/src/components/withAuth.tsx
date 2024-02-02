"use client";

import React, { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { UserState } from "../context/userState";

function withAuth(Component: any) {
  return function WithAuth(props: any) {
    const { isAuth, setisAuth } = UserState();
    useEffect(() => {
      const token = window.localStorage.getItem("token");
      if (!token) {
        redirect("/");
      } else {
        setisAuth(token);
      }
    }, []);
    if (!isAuth) {
      return null;
    }
    return <Component {...props} token={isAuth} />;
  };
}

export default withAuth;
