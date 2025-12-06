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
import type { TravelTimeEntry } from "@/utils/calendar-generation/models/SchedulingModels";
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

        // Convert travel times array to Map and store in Redux
        if (data.travelTimes.length > 0) {
          const matrix = new Map<string, TravelTimeEntry>();
          for (const tt of data.travelTimes) {
            matrix.set(tt.key, {
              fromLocationId: tt.fromLocationId,
              toLocationId: tt.toLocationId,
              rushHourMinutes: tt.rushHourMinutes,
              regularMinutes: tt.regularMinutes,
              nightMinutes: tt.nightMinutes,
            });
          }
          dispatch(setTravelTimeMatrix(matrix));
        }
      });
    }
  }, [status, user, dispatch]);

  return <>{children}</>;
}
