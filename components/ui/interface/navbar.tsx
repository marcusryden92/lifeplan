"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PowerIcon } from "@heroicons/react/24/outline";
import { CogIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { signOut } from "next-auth/react";
import { Audiowide } from "next/font/google";

const font = Audiowide({ subsets: ["latin"], weight: ["400"] });

const links = [
  { name: "Calendar", href: "/calendar" },
  { name: "Create", href: "/create" },
];

export const Navbar = () => {
  const pathname = usePathname();

  return (
    <div className="flex w-[250px] h-full flex-col">
      <div
        className={`${font.className} text-white text-[2.8rem] mb-5 mt-[-1rem]`}
      >
        LIFEPLAN
      </div>
      <div className="flex grow flex-col space-y-2">
        {links.map((link) => (
          <Button
            key={link.name}
            asChild
            variant={pathname === link.href ? "default" : "outline"}
            className="justify-start"
          >
            <Link
              href={link.href}
              className={clsx(
                "flex h-[48px] gap-2 rounded-xl p-3 text-sm font-medium hover:bg-gray-200 ",
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
          className="justify-start"
        >
          <Link
            href={"/settings"}
            className={clsx(
              "flex h-[48px] items-center gap-2 rounded-xl text-sm font-medium hover:bg-gray-200",
              {
                "bg-gray-800 text-white hover:bg-gray-700":
                  pathname === "/settings",
              }
            )}
          >
            <CogIcon className=" w-6" /> {"Settings"}
          </Link>
        </Button>
        <form
          action={() => {
            signOut();
          }}
        >
          <button className="flex h-[48px] w-full items-center  gap-2 rounded-xl bg-gray-50 p-3 pl-4 text-sm font-medium hover:bg-grey-100 hover:text-red-500">
            <PowerIcon className="w-6" />
            <div className="hidden md:block">Sign Out</div>
          </button>
        </form>
      </div>
    </div>
  );
};
