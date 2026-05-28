import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { fontDisplay, fontUI } from "@/lib/theme/fonts";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Welcome to Lifeplan!",
  description: "Create your life!",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontUI.variable}`}>
      <body
        className={`flex ${inter.className} bg-gray-200 h-auto min-h-[100vh] w-[100vw] overflow-x-hidden`}
      >
        <SessionProvider session={session}>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
