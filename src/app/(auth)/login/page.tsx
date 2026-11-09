import { unstable_cache } from "next/cache";
import Image from "next/image";
import { redirect } from "next/navigation";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { APP_CONFIG } from "@/config/app-config";
import { getCurrentProfile, getDashboardPath } from "@/lib/auth";
import { formatWhatsAppNumber, toWhatsAppUrl } from "@/lib/contact";
import logo from "@/styles/flag-icons/MIT-WEEK, WEB LOGO.png";
import type { Database } from "@/types/database";

import { LoginForm } from "../_components/login-form";

export const metadata: Metadata = {
  title: `Masuk | ${APP_CONFIG.name}`,
  description: "Masuk ke portal MIT-WEEK 2026.",
  alternates: { canonical: "/login" },
};

// The contact number is public and rarely changes, so fetch it at most once per 5 minutes
// instead of once per /login request. Errors are thrown so a failure is never cached.
const getCachedContactWhatsapp = unstable_cache(
  async (): Promise<string | null> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Supabase public configuration is missing.");

    const client = createPlainClient<Database>(url, key);
    const { data, error } = await client.rpc("get_public_contact_whatsapp");
    if (error) throw new Error("Failed to load contact number.");
    return data ?? null;
  },
  ["public-contact-whatsapp"],
  { revalidate: 300 },
);

async function loadContactWhatsapp(): Promise<string | null> {
  try {
    return await getCachedContactWhatsapp();
  } catch {
    return null;
  }
}

export default async function LoginPage() {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(getDashboardPath(profile.role));
  }

  const contactWhatsapp = await loadContactWhatsapp();
  const formattedContact = formatWhatsAppNumber(contactWhatsapp);

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
          Tim: gunakan email saat mendaftar. Juri: gunakan username dari panitia. Lupa kata sandi?{" "}
          {contactWhatsapp ? (
            <a
              href={toWhatsAppUrl(contactWhatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Hubungi panitia via WhatsApp{formattedContact ? ` (${formattedContact})` : ""}
            </a>
          ) : (
            "Hubungi panitia."
          )}
        </p>
      </Card>
      <p className="mt-6 text-center text-muted-foreground text-xs">#SiberAmanMilikBersama</p>
    </div>
  );
}
