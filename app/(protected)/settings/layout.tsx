import React, { Suspense } from "react";
import SettingsPage from "./page";
import Loading from "./loading";
import { currentUser } from "@/lib/auth";
import { SettingsPageUser } from "@/next-auth";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = (await currentUser()) as SettingsPageUser;

  console.log(user);

  return (
    <div>
      <Suspense fallback={<Loading />}>
        <SettingsPage user={user} />
      </Suspense>
    </div>
  );
}
