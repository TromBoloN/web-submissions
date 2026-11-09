"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const showcaseDetailsSchema = z.object({
  consent: z.boolean(),
  title: z.string().trim().max(80),
  description: z.string().trim().max(300),
  imagePath: z.string().nullable(),
});

export type SaveShowcaseDetailsResult = { ok: true } | { ok: false; message: string };

export async function saveShowcaseDetails(input: {
  consent: boolean;
  title: string;
  description: string;
  imagePath: string | null;
}): Promise<SaveShowcaseDetailsResult> {
  const caller = await getCurrentProfile();
  if (caller?.role !== "team") {
    return { ok: false, message: "Anda tidak memiliki akses ke tindakan ini." };
  }

  const parsed = showcaseDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Data tampilan karya tidak valid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_showcase_details", {
    p_consent: parsed.data.consent,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_image_path: parsed.data.imagePath,
  });

  if (error) {
    console.error("Failed to save showcase details", error);
    return { ok: false, message: "Gagal menyimpan tampilan karya. Coba lagi." };
  }

  if (!data) {
    return { ok: false, message: "Tampilan karya tidak dapat diubah setelah galeri diterbitkan." };
  }

  revalidatePath("/team");
  revalidatePath("/team/karya");
  revalidatePath("/karya");
  return { ok: true };
}
