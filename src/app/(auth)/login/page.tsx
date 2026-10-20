import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";

import { LoginForm } from "../_components/login-form";

export const metadata: Metadata = {
  title: `Masuk | ${APP_CONFIG.name}`,
  description: "Masuk ke portal MIT-WEEK 2026.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-8 px-6 sm:w-[350px] sm:px-0">
      <div className="space-y-2 text-center">
        <h1 className="font-medium text-3xl">Masuk ke akun Anda</h1>
        <p className="text-muted-foreground text-sm">Gunakan email dan kata sandi dari panitia.</p>
      </div>
      <LoginForm />
    </div>
  );
}
