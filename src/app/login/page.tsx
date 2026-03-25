// src/app/login/page.tsx
import { auth } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import Login from "@/src/components/Login";

interface LoginPageProps {
  searchParams: { error?: string };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session) redirect("/dashboard");

  return <Login error={searchParams.error} />;
}
