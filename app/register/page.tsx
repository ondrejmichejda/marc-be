import { redirect } from "next/navigation";

export const metadata = {
  title: "Redirecting — Marc Platform",
};

export default function RegisterPage() {
  // Registration is consolidated with Google Sign In - users are registered automatically on first login.
  redirect("/login");
}
