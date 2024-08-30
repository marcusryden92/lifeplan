"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PowerIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import UserButton from "@/components/auth/user-button";
import clsx from "clsx";
import { signOut } from "next-auth/react";

const links = [
  { name: "Server", href: "/server" },
  { name: "Client", href: "/client" },
  { name: "Admin", href: "/admin" },
  { name: "Settings", href: "/settings" },
];

export const Navbar = () => {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col px-3 py-4">
      <div className="flex grow flex-col space-y-2">
        {links.map((link) => (
          <Button
            key={link.name}
            asChild
            variant={pathname === link.href ? "default" : "outline"}
          >
            <Link
              href={link.href}
              className={clsx(
                "flex h-[48px] items-center gap-2 rounded-md p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600",
                { "bg-sky-100 text-blue-600": pathname === link.href }
              )}
            >
              {link.name}
            </Link>
          </Button>
        ))}
      </div>
      <div className="mt-auto flex flex-col space-y-2">
        <form
          action={() => {
            signOut();
          }}
        >
          <button className="flex h-[48px] w-full items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-grey-100 hover:text-red-500">
            <PowerIcon className="w-6" />
            <div className="hidden md:block">Sign Out</div>
          </button>
        </form>
      </div>
    </div>
  );
};
