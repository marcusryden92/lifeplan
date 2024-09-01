import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { currentUser } from "@/lib/auth";
import SettingsForm from "./_components/settings-form";
import { SettingsPageUser } from "@/next-auth";

const SettingsPage = async () => {
  const user = (await currentUser()) as SettingsPageUser;

  return (
    <Card className="w-[600px] h-full">
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
