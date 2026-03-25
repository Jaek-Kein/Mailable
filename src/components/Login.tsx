"use client";
import { signIn, signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

export default function AuthButton() {
  const { data } = useSession();
  const user = data?.user;

  if (user) {
    return (
      <div className="flex gap-2 items-center">
        <span>안녕, {user.name ?? user.email}</span>
        <button onClick={() => signOut()}>로그아웃</button>
      </div>
    );
  }
  return <button onClick={() => signIn("google")}>구글로 로그인</button>;
}
