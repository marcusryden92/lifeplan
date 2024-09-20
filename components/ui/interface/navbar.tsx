"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PowerIcon } from "@heroicons/react/24/outline";
import { CogIcon } from "@heroicons/react/24/outline";

import { FaPlus, FaCog, FaPowerOff, FaCalendar } from "react-icons/fa";
import { HiTemplate } from "react-icons/hi";
import { MdViewWeek } from "react-icons/md";

import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { signOut } from "next-auth/react";
import { Audiowide } from "next/font/google";

const font = Audiowide({ subsets: ["latin"], weight: ["400"] });

const links = [
  { name: "Calendar", href: "/calendar" },
  { name: "Create", href: "/create" },
  { name: "Week Template", href: "/template" },
];

export const Navbar = () => {
  const pathname = usePathname();

  return (
    <div className="flex lg:w-[280px] lg:h-full w-full flex-col p-2 lg:p-5">
      <div className={`${font.className} text-gray-900 text-[2.2rem] mb-5`}>
        LIFEPLAN
      </div>
      <div className="flex lg:h-full lg:flex-col lg:space-y-2 justify-between gap-2">
        <div className="flex lg:flex-col gap-2">
          <Button
            key={"calendar"}
            asChild
            variant={pathname === "/calendar" ? "default" : "outline"}
            className="justify-start"
          >
            <Link
              href="/calendar"
              className={clsx(
                "flex h-[48px] gap-2 rounded-xl p-3 text-sm font-medium hover:bg-amber-400 ",
                { "bg-gray-800 text-white": pathname === "/calendar" }
              )}
            >
              <FaCalendar className="w-5 h-5" />{" "}
              <span className="hidden lg:block">Calendar</span>
            </Link>
          </Button>
          <Button
            key="create"
            asChild
            variant={pathname === "/create" ? "default" : "outline"}
            className="justify-start"
          >
            <Link
              href="/create"
              className={clsx(
                "flex h-[48px] gap-2 rounded-xl p-3 text-sm font-medium hover:bg-amber-400 ",
                { "bg-gray-800 text-white": pathname === "/create" }
              )}
            >
              <FaPlus className="h-5 w-5" />{" "}
              <span className="hidden lg:block">Create</span>
            </Link>
          </Button>
          <Button
            key="template"
            asChild
            variant={pathname === "/template" ? "default" : "outline"}
            className="justify-start"
          >
            <Link
              href="/template"
              className={clsx(
                "flex h-[48px] gap-2 rounded-xl p-3 text-sm font-medium hover:bg-amber-400 ",
                { "bg-gray-800 text-white": pathname === "/template" }
              )}
            >
              <MdViewWeek className="h-5 w-5" />
              <span className="hidden lg:block">Week Template</span>
            </Link>
          </Button>
        </div>

        <div className="lg:mt-auto flex lg:flex-col lg:space-y-2 content-start gap-2">
          <Button
            key={"Setting"}
            asChild
            variant={pathname === "/settings" ? "default" : "outline"}
            className="justify-start"
          >
            <Link
              href={"/settings"}
              className={clsx(
                "flex h-[48px] items-center gap-2 rounded-xl text-sm font-medium hover:bg-amber-400",
                {
                  "bg-gray-800 text-white hover:bg-gray-700":
                    pathname === "/settings",
                }
              )}
            >
              <FaCog className="h-5 w-5" />{" "}
              <span className="hidden lg:block">Settings</span>
            </Link>
          </Button>
          <Button
            key={"SignOut"}
            asChild
            variant={pathname === "/settings" ? "default" : "outline"}
            className="justify-start rounded-xl h-[48px] "
          >
            <form
              className="mt-0"
              action={() => {
                signOut();
              }}
            >
              <button className="flex w-full  gap-2 rounded-xl text-sm font-medium hover:bg-grey-100 hover:text-red-500">
                <FaPowerOff className="h-5 w-5" />
                <span className="hidden lg:block">Sign Out</span>
              </button>
            </form>
          </Button>
        </div>
      </div>
    </div>
  );
};
