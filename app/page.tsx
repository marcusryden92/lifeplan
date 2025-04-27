"use client";

import { LoginButton } from "@/components/auth/LoginButton";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

const Home = () => {
  // Simple animation state
  const [hovered, setHovered] = useState<number | null>(null);

  // Feature items with subtle icons using ASCII characters for simplicity
  const features = [
    {
      title: "Plan",
      description: "Set goals and organize your journey.",
      icon: "◎",
    },
    {
      title: "Track",
      description: "Monitor progress and milestone achievements.",
      icon: "↗",
    },
    {
      title: "Reflect",
      description: "Learn from your experiences and adapt.",
      icon: "✦",
    },
  ];

  return (
    <main className="flex h-screen w-full flex-col items-center justify-center bg-gradient-to-tr from-gray-50 to-gray-200">
      <div className="relative max-w-3xl mx-auto space-y-10 text-center m-5 px-8 py-14 rounded-xl backdrop-blur-sm bg-white/70 shadow-lg">
        <h1 className="font-futura text-8xl font-extrabold text-gray-800 pb-6 border-b-2 border-gray-300 relative">
          <span className="relative">
            Lifeplan<span className="text-gray-900">.</span>
            <div className="absolute h-2 w-2 bg-gray-800 rounded-full -right-2 -top-1"></div>
          </span>
        </h1>

        <p className="text-gray-600 font-inter text-2xl mt-6">
          Your future, one step at a time.
        </p>

        <div className="mt-8">
          <LoginButton mode="modal" asChild>
            <Button
              variant="default"
              className="text-lg px-8 py-3 rounded-lg bg-gray-800 hover:bg-gray-900 transition-all shadow-md"
            >
              Sign In
            </Button>
          </LoginButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`p-6 rounded-lg border bg-gray-50 hover:bg-white transition-all duration-300 shadow-sm hover:shadow transform hover:-translate-y-1 cursor-default ${hovered === index ? "border-gray-400" : "border-gray-200"}`}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-2xl text-gray-800 opacity-70">
                  {feature.icon}
                </span>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
              </div>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent opacity-50"></div>
      </div>
    </main>
  );
};

export default Home;
