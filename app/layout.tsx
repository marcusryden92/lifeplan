import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import "./globals.css";
import { DataContextProvider } from "@/context/DataContext";

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
    <SessionProvider session={session}>
      <DataContextProvider>
        <html lang="en">
          <body
            className={`${inter.className} bg-gray-200 h-auto lg:h-full min-h-screen`}

            // className={`${inter.className} bg-cover bg-center bg-no-repeat min-h-screen`}
            // style={{ backgroundImage: "url('/images/california.jpg')" }}
          >
            {children}
          </body>
        </html>
      </DataContextProvider>
    </SessionProvider>
  );
}
