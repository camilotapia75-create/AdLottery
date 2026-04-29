import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";
import Link from "next/link";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #f97316 100%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">&#x1F4B0; Ad Lottery</h1>
          <p className="text-white/80">Watch ads, win real money</p>
        </div>
        <LoginForm />
        <p className="text-center text-white/60 text-sm mt-6">
          Not ready to sign up?{" "}
          <Link href="/waitlist" className="text-white underline hover:text-white/80">Join the waitlist</Link>
        </p>
      </div>
    </div>
  );
}
