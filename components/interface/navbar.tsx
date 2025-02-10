import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import {
  FaPlus,
  FaCog,
  FaPowerOff,
  FaCalendar,
  FaClipboardList,
  FaFlag,
  FaBullseye,
} from "react-icons/fa";
import { MdViewWeek } from "react-icons/md";

const links = [
  {
    name: "Calendar",
    href: "/calendar",
    icon: <FaCalendar className="h-5 w-5" />,
  },
  { name: "Create", href: "/create", icon: <FaPlus className="h-5 w-5" /> },
  {
    name: "Week Template",
    href: "/template",
    icon: <MdViewWeek className="h-5 w-5" />,
  },
];

const createLinks = [
  {
    name: "Tasks",
    href: "/create/tasks",
    icon: <FaClipboardList className="h-5 w-5" />,
  },
  {
    name: "Plans",
    href: "/create/plans",
    icon: <MdViewWeek className="h-5 w-5" />,
  },
  {
    name: "Goals",
    href: "/create/goals",
    icon: <FaFlag className="h-5 w-5" />,
  },
  {
    name: "Clarify Goals",
    href: "/create/clarify-goals",
    icon: <FaBullseye className="h-5 w-5" />,
  },
];

export const Navbar = () => {
  const pathname = usePathname();

  return (
    <div className="flex lg:w-[280px] lg:h-full w-full flex-col p-2 lg:p-5">
      <div className="hidden md:block font-audiowide text-gray-900 text-[2.2rem] mb-5">
        LIFEPLAN
      </div>
      <div className="flex lg:h-full lg:flex-col lg:space-y-2 justify-between gap-2">
        <div className="flex lg:flex-col gap-2">
          {[...links, ...createLinks].map(({ name, href, icon }) => (
            <Button
              key={href}
              asChild
              variant={pathname === href ? "default" : "outline"}
              className="justify-start"
            >
              <Link
                href={href}
                className={clsx(
                  "flex h-[48px] gap-2 rounded-xl p-3 text-sm font-medium hover:bg-amber-400",
                  { "bg-gray-800 text-white": pathname === href }
                )}
              >
                {icon} <span className="hidden lg:block">{name}</span>
              </Link>
            </Button>
          ))}
        </div>

        <div className="lg:mt-auto flex lg:flex-col lg:space-y-2 content-start gap-2">
          <Button
            asChild
            variant={pathname === "/settings" ? "default" : "outline"}
            className="justify-start"
          >
            <Link
              href="/settings"
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
            asChild
            variant="outline"
            className="justify-start rounded-xl h-[48px] hover:text-red-500 hover:border-red-500 hover:border-2 cursor-pointer"
          >
            <form className="mt-0" action={() => signOut()}>
              <button className="flex w-full gap-2 rounded-xl text-sm font-medium hover:bg-grey-100">
                <FaPowerOff className="h-5 w-5" />{" "}
                <span className="hidden lg:block">Sign Out</span>
              </button>
            </form>
          </Button>
        </div>
      </div>
    </div>
  );
};
