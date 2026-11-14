import { requireRole } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { type CaseStudySubmission, CaseStudyView } from "./case-study-view";

export default async function TeamCaseStudyPage() {
  const profile = await requireRole("team");
  const supabase = await createClient();

  const [caseStudyRes, settingsRes, teamRes] = await Promise.all([
    supabase.from("case_study").select("title, content_md, updated_at").eq("id", true).maybeSingle(),
    supabase.from("competition_settings").select("submission_closes_at, juknis_url").eq("id", true).maybeSingle(),
    supabase.from("teams").select("id").eq("profile_id", profile.id).maybeSingle(),
  ]);
  const caseStudy = caseStudyRes.data;

  // Own submission only (RLS), to tick the deliverables checklist. Failure just leaves it unticked.
  let submission: CaseStudySubmission | null = null;
  if (teamRes.data) {
    const { data } = await supabase
      .from("submissions")
      .select("status, github_url, live_demo_url, video_url")
      .eq("team_id", teamRes.data.id)
      .maybeSingle();
    if (data) {
      submission = {
        status: data.status,
        githubUrl: data.github_url,
        liveDemoUrl: data.live_demo_url,
        videoUrl: data.video_url,
      };
    }
  }

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
      submission={submission}
    />
  );
}
