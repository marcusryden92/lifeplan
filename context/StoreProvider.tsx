"use client";

import { ReactNode, useEffect } from "react";
import { Provider, useDispatch } from "react-redux";
import store from "@/redux/store";
import { useSession } from "next-auth/react";
import { setUser } from "@/redux/slices/userSlice";
import { User } from "@/types/user";
import React from "react";

export default function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <SessionProvider>{children}</SessionProvider>
    </Provider>
  );
}

function SessionProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();
  const { data: session, status } = useSession();
  const user: User | undefined = session?.user;

  useEffect(() => {
    if (status === "authenticated" && user) {
      dispatch(setUser(user));
    }
  }, [status, user, dispatch]);

  return <>{children}</>;
}
