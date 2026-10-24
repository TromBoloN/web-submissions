import { CaseStudyView } from "@/app/(main)/team/studi-kasus/case-study-view";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function JudgeCaseStudyPage() {
  await requireRole("judge");
  const supabase = await createClient();

  const { data: caseStudy } = await supabase
    .from("case_study")
    .select("title, content_md, updated_at")
    .eq("id", true)
    .maybeSingle();

  return (
    <CaseStudyView
      userRole="judge"
      caseStudy={
        caseStudy
          ? {
              title: caseStudy.title,
              contentMd: caseStudy.content_md,
              updatedAt: caseStudy.updated_at,
            }
          : null
      }
      releaseAt={null}
    />
  );
}
