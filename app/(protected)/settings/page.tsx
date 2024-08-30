import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";

import SettingsForm from "./_components/settings-form";
import { SettingsPageUser } from "@/next-auth";

const SettingsPage = async () => {
  const user = (await useCurrentUser()) as SettingsPageUser;

  return (
    <Card className="w-[600px]">
      <CardHeader>
        <p className="text-xl font-semibold">Settings</p>
      </CardHeader>
      <CardContent>
        <SettingsForm user={user} />
      </CardContent>
    </Card>
  );
};

export default SettingsPage;
