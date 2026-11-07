import { requireRole } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { CaseStudyView } from "./case-study-view";

export default async function TeamCaseStudyPage() {
  await requireRole("team");
  const supabase = await createClient();

  const [caseStudyRes, settingsRes] = await Promise.all([
    supabase.from("case_study").select("title, content_md, updated_at").eq("id", true).maybeSingle(),
    supabase.from("competition_settings").select("submission_closes_at, juknis_url").eq("id", true).maybeSingle(),
  ]);
  const caseStudy = caseStudyRes.data;

  let releaseAt: string | null = null;
  // Jika baris disembunyikan oleh RLS (sebelum release_at), ambil HANYA release_at dengan adminClient
  if (!caseStudy) {
    const { data: releaseData } = await adminClient
      .from("case_study")
      .select("release_at")
      .eq("id", true)
      .maybeSingle();
    releaseAt = releaseData?.release_at ?? null;
  }

  return (
    <CaseStudyView
      userRole="team"
      caseStudy={
        caseStudy
          ? {
              title: caseStudy.title,
              contentMd: caseStudy.content_md,
              updatedAt: caseStudy.updated_at,
            }
          : null
      }
      releaseAt={releaseAt}
      deadlineIso={settingsRes.data?.submission_closes_at ?? null}
      juknisUrl={settingsRes.data?.juknis_url ?? null}
      serverNowIso={new Date().toISOString()}
    />
  );
}
