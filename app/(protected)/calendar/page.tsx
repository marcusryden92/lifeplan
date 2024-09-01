import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { currentUser } from "@/lib/auth";
import { SettingsPageUser } from "@/next-auth";

const SettingsPage = async () => {
  const user = (await currentUser()) as SettingsPageUser;

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <p className="text-xl font-semibold">Calendar</p>
      </CardHeader>
      <CardContent></CardContent>
    </Card>
  );
};

export default SettingsPage;
