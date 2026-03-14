import { SignUp } from "@clerk/clerk-react";

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
      <div className="glass-effect p-8 rounded-2xl border border-border">
        <SignUp routing="path" path="/register" signInUrl="/login" />
      </div>
    </div>
  );
}
