const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  // bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-200 to-orange-500
  return (
    <div
      className="h-full flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/california.jpg')" }}
    >
      {children}
    </div>
  );
};

export default AuthLayout;
