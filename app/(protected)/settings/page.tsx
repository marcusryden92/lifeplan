import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { currentUser } from "@/lib/auth";
import SettingsForm from "./_components/SettingsForm";
import { SettingsPageUser } from "@/next-auth";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Calendar } from "lucide-react";

const SettingsPage = async () => {
  const user = (await currentUser()) as SettingsPageUser;

  return (
    <div className="flex w-full h-full">
      <Card className="w-[600px] h-full rounded-none border-none shadow-none">
        <CardHeader>
          <p className="text-xl font-semibold">Settings</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <SettingsForm user={user} />

          {/* Advanced settings removed scheduling link — use sidebar link to access scheduling settings */}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
