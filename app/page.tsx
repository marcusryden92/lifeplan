import { LoginButton } from "@/components/auth/login-button";
import { Button } from "@/components/ui/button";
import { KeyIcon } from "@heroicons/react/16/solid";

import { cn } from "@/lib/utils";
import { Poppins } from "next/font/google";

const font = Poppins({
  subsets: ["latin"],
  weight: ["600"],
});

export default function Home() {
  return (
    <main className="flex h-full flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-200 to-orange-500">
      <div className="space-y-6 text-center">
        <h1
          className={`${font.className} flex text-6xl font-semibold text-white drop-shadow-md`}
        >
          🔑 Auth
        </h1>
        <p className="text-white text-lg">A simple authentication service</p>
        <div>
          <LoginButton mode="modal" asChild>
            <Button variant="secondary" size="lg">
              Sign in
            </Button>
          </LoginButton>
        </div>
      </div>
    </main>
  );
}
