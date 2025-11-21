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

          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold mb-3">Advanced Settings</h3>
            <Link href="/settings/scheduling">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Scheduling Strategies
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
