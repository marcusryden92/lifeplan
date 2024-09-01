"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PowerIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { signOut } from "next-auth/react";

const links = [
  { name: "Server", href: "/server" },
  { name: "Client", href: "/client" },
  { name: "Admin", href: "/admin" },
];

export const Navbar = () => {
  const pathname = usePathname();

  return (
    <div className="flex w-[250px] h-full flex-col">
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
                "flex h-[48px] items-center gap-2 rounded-xl p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600",
                { "bg-gray-800 text-white": pathname === link.href }
              )}
            >
              {link.name}
            </Link>
          </Button>
        ))}
      </div>
      <div className="mt-auto flex flex-col space-y-2">
        <Button
          key={"Setting"}
          asChild
          variant={pathname === "/settings" ? "default" : "outline"}
        >
          <Link
            href={"/settings"}
            className={clsx(
              "flex h-[48px] items-center gap-2 rounded-xl p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600",
              { "bg-gray-800 text-white": pathname === "/settings" }
            )}
          >
            {"Settings"}
          </Link>
        </Button>
        <form
          action={() => {
            signOut();
          }}
        >
          <button className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gray-50 p-3 text-sm font-medium hover:bg-grey-100 hover:text-red-500">
            <PowerIcon className="w-6" />
            <div className="hidden md:block">Sign Out</div>
          </button>
        </form>
      </div>
    </div>
  );
};
