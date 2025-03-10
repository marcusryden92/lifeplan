import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { currentUser } from "@/lib/auth";
import SettingsForm from "./_components/SettingsForm";
import { SettingsPageUser } from "@/next-auth";

const SettingsPage = async () => {
  const user = (await currentUser()) as SettingsPageUser;

  return (
    <div className="flex w-full h-full">
      <Card className="w-[600px] h-full rounded-none border-none shadow-none">
        <CardHeader>
          <p className="text-xl font-semibold">Settings</p>
        </CardHeader>
        <CardContent>
          <SettingsForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
