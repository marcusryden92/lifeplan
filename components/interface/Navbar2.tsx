import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import clsx from "clsx";
import {
  FaPlus,
  FaCog,
  FaPowerOff,
  FaCalendar,
  FaClipboardList,
  FaFlag,
  FaBullseye,
  FaClock,
} from "react-icons/fa";
import { MdViewWeek } from "react-icons/md";

const links = [
  {
    name: "Calendar",
    href: "/calendar",
    icon: <FaCalendar className="h-5 w-5" />,
  },
  {
    name: "Week Template",
    href: "/template",
    icon: <MdViewWeek className="h-5 w-5" />,
  },
];

const createLinks = [
  { name: "Create", href: "/create", icon: <FaPlus className="h-5 w-5" /> },
  {
    name: "Tasks",
    href: "/create/tasks",
    icon: <FaClipboardList className="h-5 w-5" />,
  },
  {
    name: "Plans",
    href: "/create/plans",
    icon: <FaClock className="h-5 w-5" />,
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
    <nav className="flex bg-white lg:w-[12vw] lg:h-full w-full flex-col p-2 lg:px-5 lg:pb-5 shadow-md rounded-lg border-b border-t border-r border-gray-300 border-r-gray-200">
      <h1 className="hidden md:block font-futura text-gray-800 border-b border-gray-300 text-[2.2rem] mb-4">
        Lifeplan.
      </h1>
      <div className="flex lg:h-full lg:flex-col lg:space-y-2 justify-between gap-2">
        <div className="flex lg:flex-col gap-2">
          {[...links, ...createLinks].map(({ name, href, icon }) => (
            <Button
              key={href}
              asChild
              variant={pathname === href ? "default" : "outline"}
              size="sm"
              className="justify-start"
            >
              <Link
                href={href}
                className={clsx(
                  "flex h-[38px] gap-2 rounded-xl p-3 text-sm font-medium",
                  pathname === href
                    ? "bg-gray-800 text-white"
                    : "hover:bg-gray-100"
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
            size="sm"
          >
            <Link
              href="/settings"
              className={clsx(
                "flex h-[38px] items-center gap-2 rounded-xl text-sm font-medium",
                pathname === "/settings"
                  ? "bg-gray-800 text-white"
                  : "hover:bg-gray-100"
              )}
            >
              <FaCog className="h-5 w-5" />{" "}
              <span className="hidden lg:block">Settings</span>
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="justify-start">
            <div
              className={clsx(
                "flex h-[38px] items-center gap-2 rounded-xl text-sm font-medium cursor-pointer",
                "hover:text-red-500 hover:border-red-500 hover:border-2 hover:bg-transparent"
              )}
              onClick={() => signOut()}
            >
              <FaPowerOff className="h-5 w-5" />
              <span className="hidden lg:block">Sign Out</span>
            </div>
          </Button>
        </div>
      </div>
    </nav>
  );
};
