import React, { Suspense } from "react";
import SettingsPage from "./page";
import Loading from "./loading";
import { currentUser } from "@/lib/auth";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  return (
    <div>
      <Suspense fallback={<Loading />}>
        <SettingsPage user={user} />
      </Suspense>
    </div>
  );
}
