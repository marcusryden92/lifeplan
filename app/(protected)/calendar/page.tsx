import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { currentUser } from "@/lib/auth";
import { SettingsPageUser } from "@/next-auth";
import Calendar from "@/components/calendar/calendar";

const SettingsPage = async () => {
  const user = (await currentUser()) as SettingsPageUser;

  return (
    <div className="w-full h-full bg-white rounded-xl bg-opacity-95 overflow-hidden max-h-[100vh] px-10">
      <CardHeader className="px-0">
        <p className="text-xl font-semibold">Calendar</p>
      </CardHeader>
      <CardContent className="flex-grow h-full px-0">
        <Calendar />
      </CardContent>
    </div>
  );
};

export default SettingsPage;
