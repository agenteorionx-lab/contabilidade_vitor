import { SignIn } from "@clerk/clerk-react";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
      <div className="glass-effect p-8 rounded-2xl border border-border">
        <SignIn routing="path" path="/login" signUpUrl="/register" />
      </div>
    </div>
  );
}
