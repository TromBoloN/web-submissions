"use server";

import { redirect } from "next/navigation";

import { z } from "zod";

import { getDashboardPath } from "@/lib/auth";
import { loginIdentifierToEmail } from "@/lib/identity";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

export type LoginResult = {
  error?: string;
};

export async function signIn(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier") ?? formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Email atau kata sandi salah." };
  }

  const email = loginIdentifierToEmail(parsed.data.identifier);
  if (!email) {
    return { error: "Email atau kata sandi salah." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (signInError) {
    return { error: "Email atau kata sandi salah." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await supabase.auth.signOut();
    return { error: "Email atau kata sandi salah." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_active, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: "Akun Anda tidak aktif. Hubungi panitia." };
  }

  redirect(getDashboardPath(profile.role));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
