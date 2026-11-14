import { createClient } from "@/lib/supabase/server";

import { SettingsLoadError } from "../settings-load-error";
import { CaseStudyClient } from "./case-study-client";

export default async function CaseStudySettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("case_study")
    .select("title, content_md, release_at, updated_at")
    .eq("id", true)
    .maybeSingle();

  if (error) return <SettingsLoadError />;

  return (
    <CaseStudyClient
      caseStudy={
        data
          ? { title: data.title, contentMd: data.content_md, releaseAt: data.release_at, updatedAt: data.updated_at }
          : null
      }
    />
  );
}
