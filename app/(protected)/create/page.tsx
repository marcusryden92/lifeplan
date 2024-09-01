import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { currentUser } from "@/lib/auth";
import { SettingsPageUser } from "@/next-auth";

const SettingsPage = async () => {
  const user = (await currentUser()) as SettingsPageUser;

  return (
    <Card className="w-full h-full bg-opacity-35 ">
      <CardHeader>
        <p className="text-xl font-semibold">Create</p>
      </CardHeader>
      <CardContent></CardContent>
    </Card>
  );
};

export default SettingsPage;
