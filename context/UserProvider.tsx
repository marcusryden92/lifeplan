"use client";

import { ReactNode, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useSession } from "next-auth/react";
import { setUser } from "@/redux/slices/userSlice";
import { setSchedulingSettings } from "@/redux/slices/schedulingSettingsSlice";
import { fetchUserSchedulingPreferences } from "@/actions/scheduling";
import { User } from "@/types/user";
import React from "react";

export default function UserProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();
  const { data: session, status } = useSession();
  const user: User | undefined = session?.user;

  useEffect(() => {
    if (status === "authenticated" && user) {
      dispatch(setUser(user));

      // Load user's scheduling settings
      fetchUserSchedulingPreferences().then((prefs) => {
        if (prefs) {
          dispatch(
            setSchedulingSettings({
              bufferTimeMinutes: prefs.bufferTimeMinutes,
            })
          );
        }
      });
    }
  }, [status, user, dispatch]);

  return <>{children}</>;
}
