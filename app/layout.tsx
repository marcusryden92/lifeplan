import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import "./globals.css";
import { DataContextProvider } from "@/context/DataContext";
import StoreProvider from "@/context/StoreProvider";
import UserProvider from "@/context/UserProvider";

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
        <StoreProvider>
          <UserProvider>
            <html lang="en">
              <body
                className={`flex ${inter.className} bg-gray-200 h-auto min-h-[100vh] w-[100vw] overflow-x-hidden`}

                // className={`${inter.className} bg-cover bg-center bg-no-repeat min-h-screen`}
                // style={{ backgroundImage: "url('/images/california.jpg')" }}
              >
                {children}
              </body>
            </html>
          </UserProvider>
        </StoreProvider>
      </DataContextProvider>
    </SessionProvider>
  );
}
