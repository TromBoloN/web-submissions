"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { usernameToEmail } from "@/lib/identity";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const baseAccountSchema = z.object({
  full_name: z.string().trim().min(1, "Nama wajib diisi."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
});

const accountSchema = z.discriminatedUnion("role", [
  baseAccountSchema.extend({
    role: z.literal("admin"),
    email: z.email("Email tidak valid.").transform((value) => value.trim().toLowerCase()),
  }),
  baseAccountSchema.extend({
    role: z.literal("judge"),
    username: z
      .string()
      .trim()
      .min(1, "Username wajib diisi.")
      .refine((val) => usernameToEmail(val) !== null, {
        message:
          "Username juri tidak valid (gunakan 3-32 karakter huruf kecil, angka, titik, strip, atau garis bawah).",
      })
      .transform((val) => val.trim().toLowerCase()),
    judge_stage: z.enum(["preliminary", "final", "both"]),
  }),
  baseAccountSchema
    .extend({
      role: z.literal("team"),
      email: z.email("Email tidak valid.").transform((value) => value.trim().toLowerCase()),
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

const baseUpdateSchema = z.object({
  userId: z.string().uuid("ID akun tidak valid."),
  full_name: z.string().trim().min(1, "Nama wajib diisi."),
});

const updateAccountSchema = z.discriminatedUnion("role", [
  baseUpdateSchema.extend({
    role: z.literal("admin"),
  }),
  baseUpdateSchema.extend({
    role: z.literal("judge"),
    judge_stage: z.enum(["preliminary", "final", "both"], {
      message: "Tahap juri harus dipilih.",
    }),
  }),
  baseUpdateSchema
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
  | {
      success: true;
      account: {
        email: string;
        password: string;
        role: "admin" | "judge" | "team";
        username?: string;
      };
    }
  | { success: false; error: string };

export type ActionResult = { success: true } | { success: false; error: string };

export type ResetPasswordResult = { success: true; password: string } | { success: false; error: string };

function getDuplicateError(error: { code?: string; message?: string } | null, isJudge = false) {
  if (error?.code !== "23505") return null;
  const message = error.message?.toLowerCase() ?? "";
  if (message.includes("email")) return isJudge ? "Username juri sudah terdaftar." : "Email sudah terdaftar.";
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
    password: formData.get("password"),
    role,
    ...(role === "judge"
      ? {
          username: formData.get("username") ?? formData.get("email"),
          judge_stage: formData.get("judge_stage"),
        }
      : {
          email: formData.get("email"),
        }),
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

  const targetEmail =
    parsed.data.role === "judge" ? (usernameToEmail(parsed.data.username) as string) : parsed.data.email;

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: targetEmail,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    if (authError?.message.toLowerCase().includes("already")) {
      return {
        success: false,
        error: parsed.data.role === "judge" ? "Username juri sudah terdaftar." : "Email sudah terdaftar.",
      };
    }
    console.error("Failed to create auth user", authError);
    return { success: false, error: "Gagal membuat akun. Coba lagi." };
  }

  const userId = authUser.user.id;
  const profileData = {
    id: userId,
    email: targetEmail,
    full_name: parsed.data.full_name,
    role: parsed.data.role,
    judge_stage: parsed.data.role === "judge" ? parsed.data.judge_stage : null,
  } satisfies Database["public"]["Tables"]["profiles"]["Insert"];

  const { error: profileError } = await adminClient.from("profiles").insert(profileData);
  if (profileError) {
    await adminClient.auth.admin.deleteUser(userId);
    const duplicateError = getDuplicateError(profileError, parsed.data.role === "judge");
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

  revalidatePath("/admin/akun");
  return {
    success: true,
    account: {
      email: targetEmail,
      password: parsed.data.password,
      role: parsed.data.role,
      ...(parsed.data.role === "judge" ? { username: parsed.data.username } : {}),
    },
  };
}

export async function toggleAccountActive(input: { userId: string; targetActive: boolean }): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = z
    .object({
      userId: z.string().uuid("ID akun tidak valid."),
      targetActive: z.boolean(),
    })
    .safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  if (caller.id === parsed.data.userId && !parsed.data.targetActive) {
    return { success: false, error: "Anda tidak dapat menonaktifkan akun Anda sendiri." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: parsed.data.targetActive })
    .eq("id", parsed.data.userId);

  if (error) {
    console.error("Failed to toggle account active status", error);
    return { success: false, error: "Gagal mengubah status akun. Coba lagi." };
  }

  revalidatePath("/admin/akun");
  return { success: true };
}

export async function resetAccountPassword(input: { userId: string; password: string }): Promise<ResetPasswordResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = z
    .object({
      userId: z.string().uuid("ID akun tidak valid."),
      password: z.string().min(8, "Kata sandi minimal 8 karakter."),
    })
    .safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const { error } = await adminClient.auth.admin.updateUserById(parsed.data.userId, {
    password: parsed.data.password,
  });

  if (error) {
    console.error("Failed to reset password", error);
    return { success: false, error: "Gagal mereset kata sandi. Coba lagi." };
  }

  return { success: true, password: parsed.data.password };
}

export async function updateAccount(formData: FormData): Promise<ActionResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "admin") {
    return { success: false, error: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const role = formData.get("role");
  const rawData = {
    userId: formData.get("userId"),
    full_name: formData.get("full_name"),
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

  const parsed = updateAccountSchema.safeParse(rawData);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data perubahan tidak valid." };
  }

  const supabase = await createClient();

  const { data: targetProfile, error: profileFetchError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", parsed.data.userId)
    .maybeSingle();

  if (profileFetchError || !targetProfile) {
    return { success: false, error: "Akun tidak ditemukan." };
  }

  if (targetProfile.role !== parsed.data.role) {
    return { success: false, error: "Role akun tidak dapat diubah." };
  }

  if (parsed.data.role === "team") {
    const { error: teamError } = await supabase
      .from("teams")
      .update({
        team_name: parsed.data.team_name,
        institution: parsed.data.institution,
        leader_name: parsed.data.leader_name,
        members: parsed.data.members,
        team_code: parsed.data.team_code,
      })
      .eq("profile_id", parsed.data.userId);

    if (teamError) {
      const duplicateError = getDuplicateError(teamError);
      if (duplicateError) return { success: false, error: duplicateError };
      console.error("Failed to update team", teamError);
      return { success: false, error: "Gagal memperbarui data tim. Coba lagi." };
    }
  }

  const profileUpdates: Database["public"]["Tables"]["profiles"]["Update"] = {
    full_name: parsed.data.full_name,
    judge_stage: parsed.data.role === "judge" ? parsed.data.judge_stage : null,
  };

  const { error: profileError } = await supabase.from("profiles").update(profileUpdates).eq("id", parsed.data.userId);

  if (profileError) {
    console.error("Failed to update profile", profileError);
    return { success: false, error: "Gagal memperbarui profil akun. Coba lagi." };
  }

  revalidatePath("/admin/akun");
  if (parsed.data.role === "team") {
    revalidatePath("/admin/tim");
  }
  return { success: true };
}
