"use client";

import { ReactNode } from "react";
import { Provider } from "react-redux";
import store from "@/redux/store";
import React from "react";

export default function StoreProvider({ children }: { children: ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
