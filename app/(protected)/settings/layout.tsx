import React, { Suspense } from "react";
import SettingsPage from "./page";
import Loading from "./loading";
import { currentUser } from "@/lib/auth";
import { User } from "@/next-auth";

export default async function Layout() {
  const user = (await currentUser()) as User;

  return (
    <div>
      <Suspense fallback={<Loading />}>
        <SettingsPage user={user} />
      </Suspense>
    </div>
  );
}
