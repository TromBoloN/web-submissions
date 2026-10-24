"use server";

import { redirect } from "next/navigation";

import { createClient as createStatelessClient } from "@supabase/supabase-js";
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

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Kata sandi saat ini wajib diisi."),
    newPassword: z
      .string()
      .min(10, "Kata sandi baru minimal 10 karakter.")
      .max(72, "Kata sandi baru maksimal 72 karakter."),
    confirmPassword: z.string().min(1, "Konfirmasi kata sandi baru wajib diisi."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Kata sandi baru harus berbeda dari kata sandi saat ini.",
    path: ["newPassword"],
  });

export type ChangePasswordResult = { success: true } | { success: false; error: string };

export async function changePassword(input: unknown): Promise<ChangePasswordResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data kata sandi tidak valid." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false, error: "Sesi telah berakhir. Silakan masuk kembali." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    console.error("Missing Supabase URL or publishable key for password verification.");
    return { success: false, error: "Terjadi kesalahan sistem. Coba lagi nanti." };
  }

  // Verify the current password using a separate stateless client so cookies are untouched
  const statelessClient = createStatelessClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error: verifyError } = await statelessClient.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });

  if (verifyError) {
    return { success: false, error: "Kata sandi saat ini salah." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateError) {
    return { success: false, error: "Gagal memperbarui kata sandi. Coba lagi." };
  }

  // End all other active sessions for this account
  await supabase.auth.signOut({ scope: "others" });

  return { success: true };
}
