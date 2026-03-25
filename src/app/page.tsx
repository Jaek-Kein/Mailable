// src/app/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  redirect("/dashboard");
}
