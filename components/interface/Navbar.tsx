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

import styles from "./Navbar.module.css";

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
    href: "/tasks",
    icon: <FaClipboardList className="h-5 w-5" />,
  },
  {
    name: "Plans",
    href: "/plans",
    icon: <FaClock className="h-5 w-5" />,
  },
  {
    name: "Goals",
    href: "/goals",
    icon: <FaFlag className="h-5 w-5" />,
  },
  {
    name: "Refine Goals",
    href: "/refine",
    icon: <FaBullseye className="h-5 w-5" />,
  },
];

export const Navbar = () => {
  const pathname = usePathname();

  return (
    <nav className={styles.navbar}>
      <section className={styles.titleContainer}>
        <h1>Lifeplan.</h1>
      </section>
      <div className="mb-4" />
      <div className="flex lg:h-full lg:flex-col  justify-between gap-2">
        <div className="flex lg:flex-col gap-2">
          {[...links].map(({ name, href, icon }) => (
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
        <div className="mt-2 mb-2 border-b " />

        <div className="flex lg:flex-col gap-2">
          {[...createLinks].map(({ name, href, icon }) => (
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
      <div className="mb-4" />
    </nav>
  );
};
