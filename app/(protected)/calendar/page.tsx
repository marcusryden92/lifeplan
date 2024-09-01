import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { currentUser } from "@/lib/auth";
import { SettingsPageUser } from "@/next-auth";

const SettingsPage = async () => {
  const user = (await currentUser()) as SettingsPageUser;

  return (
    <div className="w-full h-full bg-white rounded-xl bg-opacity-95">
      <CardHeader>
        <p className="text-xl font-semibold">Calendar</p>
      </CardHeader>
      <CardContent></CardContent>
    </div>
  );
};

export default SettingsPage;
