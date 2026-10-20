"use server";

import "server-only";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

const baseAccountSchema = z.object({
  full_name: z.string().trim().min(1, "Nama wajib diisi."),
  email: z.email("Email tidak valid.").transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
});

const accountSchema = z.discriminatedUnion("role", [
  baseAccountSchema.extend({
    role: z.literal("admin"),
  }),
  baseAccountSchema.extend({
    role: z.literal("judge"),
    judge_stage: z.enum(["preliminary", "final", "both"]),
  }),
  baseAccountSchema
    .extend({
      role: z.literal("team"),
      team_name: z.string().trim().min(1, "Nama tim wajib diisi."),
      institution: z.string().trim().min(1, "Institusi wajib diisi."),
      leader_name: z.string().trim().min(1, "Nama ketua wajib diisi."),
      members: z.array(z.string().trim().min(1, "Nama anggota tidak boleh kosong.")).min(1),
      team_code: z
        .string()
        .trim()
        .regex(/^MIT-\d{3}$/, "Kode tim harus berformat MIT-001."),
    })
    .refine((data) => data.members.includes(data.leader_name), {
      message: "Anggota harus mencantumkan ketua tim.",
      path: ["members"],
    }),
]);

export type CreateAccountResult =
  | { success: true; account: { email: string; password: string } }
  | { success: false; error: string };

function getDuplicateError(error: { code?: string; message?: string } | null) {
  if (error?.code !== "23505") return null;
  const message = error.message?.toLowerCase() ?? "";
  if (message.includes("email")) return "Email sudah terdaftar.";
  if (message.includes("team_name")) return "Nama tim sudah dipakai.";
  if (message.includes("team_code")) return "Kode tim sudah dipakai.";
  return "Data akun sudah terdaftar.";
}

export async function createAccount(formData: FormData): Promise<CreateAccountResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const role = formData.get("role");
  const rawData = {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role,
    ...(role === "judge" ? { judge_stage: formData.get("judge_stage") } : {}),
    ...(role === "team"
      ? {
          team_name: formData.get("team_name"),
          institution: formData.get("institution"),
          leader_name: formData.get("leader_name"),
          members: (() => {
            try {
              return JSON.parse(String(formData.get("members") ?? "[]"));
            } catch {
              return [];
            }
          })(),
          team_code: formData.get("team_code"),
        }
      : {}),
  };
  const parsed = accountSchema.safeParse(rawData);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data akun tidak valid." };
  }

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    if (authError?.message.toLowerCase().includes("already")) {
      return { success: false, error: "Email sudah terdaftar." };
    }
    console.error("Failed to create auth user", authError);
    return { success: false, error: "Gagal membuat akun. Coba lagi." };
  }

  const userId = authUser.user.id;
  const profileData = {
    id: userId,
    email: parsed.data.email,
    full_name: parsed.data.full_name,
    role: parsed.data.role,
    judge_stage: parsed.data.role === "judge" ? parsed.data.judge_stage : null,
  } satisfies Database["public"]["Tables"]["profiles"]["Insert"];

  const { error: profileError } = await adminClient.from("profiles").insert(profileData);
  if (profileError) {
    await adminClient.auth.admin.deleteUser(userId);
    const duplicateError = getDuplicateError(profileError);
    if (duplicateError) return { success: false, error: duplicateError };
    console.error("Failed to create profile", profileError);
    return { success: false, error: "Gagal membuat profil akun. Coba lagi." };
  }

  if (parsed.data.role === "team") {
    const { error: teamError } = await adminClient.from("teams").insert({
      profile_id: userId,
      team_code: parsed.data.team_code,
      team_name: parsed.data.team_name,
      institution: parsed.data.institution,
      leader_name: parsed.data.leader_name,
      members: parsed.data.members,
    });
    if (teamError) {
      await adminClient.from("profiles").delete().eq("id", userId);
      await adminClient.auth.admin.deleteUser(userId);
      const duplicateError = getDuplicateError(teamError);
      if (duplicateError) return { success: false, error: duplicateError };
      console.error("Failed to create team", teamError);
      return { success: false, error: "Gagal membuat data tim. Coba lagi." };
    }
  }

  return { success: true, account: { email: parsed.data.email, password: parsed.data.password } };
}
