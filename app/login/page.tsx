import { Suspense } from "react";
import { connection } from "next/server";
import { LoginView } from "@/app/components/LoginView";
import { getCurrentUser, isGoogleAuthConfigured } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign In — Marc Platform",
  description: "Sign in with your Google account. Accounts are provisioned automatically.",
};

async function LoginSessionCheck() {
  await connection();
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }
  return null;
}

export default function LoginPage() {
  const configured = isGoogleAuthConfigured();

  return (
    <>
      <Suspense fallback={null}>
        <LoginSessionCheck />
      </Suspense>
      <LoginView isConfigured={configured} />
    </>
  );
}
