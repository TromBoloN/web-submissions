import Image from "next/image";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { APP_CONFIG } from "@/config/app-config";
import { getCurrentProfile, getDashboardPath } from "@/lib/auth";
import logo from "@/styles/flag-icons/MIT-WEEK, WEB LOGO.png";

import { LoginForm } from "../_components/login-form";

export const metadata: Metadata = {
  title: `Masuk | ${APP_CONFIG.name}`,
  description: "Masuk ke portal MIT-WEEK 2026.",
  alternates: { canonical: "/login" },
};

export default async function LoginPage() {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(getDashboardPath(profile.role));
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center">
      <Card className="w-full gap-6 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Image src={logo} alt="" className="size-24 object-contain" priority />
          <h1 className="mt-3 font-semibold text-2xl tracking-tight">{APP_CONFIG.name}</h1>
          <p className="mt-1 text-muted-foreground text-sm">Portal Pengumpulan Karya Web Development</p>
        </div>
        <LoginForm />
        <p className="text-center text-muted-foreground text-xs leading-relaxed">
          Tim: gunakan email saat mendaftar. Juri: gunakan username dari panitia. Lupa kata sandi? Hubungi panitia.
        </p>
      </Card>
      <p className="mt-6 text-center text-muted-foreground text-xs">#SiberAmanMilikBersama</p>
    </div>
  );
}
