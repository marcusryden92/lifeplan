"use client";

import { ReactNode, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useSession } from "next-auth/react";
import { setUser } from "@/redux/slices/userSlice";
import {
  setSchedulingSettings,
  setTravelTimeMatrix,
} from "@/redux/slices/schedulingSettingsSlice";
import { fetchAllSchedulingData } from "@/actions/scheduling";
import { User } from "@/types/user";
import React from "react";

export default function UserProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();
  const { data: session, status } = useSession();
  const user: User | undefined = session?.user;

  useEffect(() => {
    if (status === "authenticated" && user) {
      dispatch(setUser(user));

      // Load user's scheduling settings and travel times
      fetchAllSchedulingData().then((data) => {
        // Set scheduling preferences
        dispatch(
          setSchedulingSettings({
            bufferTimeMinutes: data.preferences.bufferTimeMinutes,
          })
        );

        // Store travel times as serializable array (converted to Map when needed)
        if (data.travelTimes.length > 0) {
          dispatch(setTravelTimeMatrix(data.travelTimes));
        }
      });
    }
  }, [status, user, dispatch]);

  return <>{children}</>;
}
