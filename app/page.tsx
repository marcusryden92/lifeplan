import { LoginButton } from "@/components/auth/LoginButton";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <main
      className="flex h-[100vh] w-[100vw] flex-col items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/california.jpg')" }}
    >
      <div className="space-y-6 text-center">
        <h1
          className={`font-audiowide flex text-9xl font-semibold text-white drop-shadow-md`}
        >
          LIFEPLAN
        </h1>
        {/* <p className="text-white text-4xl">CREATE YOUR LIFE</p> */}
        <div>
          <LoginButton mode="modal" asChild>
            <Button variant="default" size="xl" className="text-xl">
              Sign in
            </Button>
          </LoginButton>
        </div>
      </div>
    </main>
  );
}
