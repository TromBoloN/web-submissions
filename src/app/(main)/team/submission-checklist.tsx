"use client";

import { useState } from "react";

import { cn } from "cn";
import { CheckCircle2, ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const CHECKLIST_ITEMS = [
  {
    id: "public_repo",
    label: "Repositori GitHub berstatus publik (coba buka lewat jendela penyamaran).",
  },
  {
    id: "readme_docs",
    label: "README menjelaskan fitur utama dan cara menjalankan proyek.",
  },
  {
    id: "live_demo",
    label: "Live demo bisa dibuka tanpa login atau instalasi apa pun.",
  },
  {
    id: "video_access",
    label: "Video demo bisa ditonton siapa saja yang memiliki tautan.",
  },
  {
    id: "video_duration",
    label: "Durasi dan isi video sudah sesuai juknis.",
  },
  {
    id: "links_verified",
    label: "Tautan sudah dicek ulang, tanpa typo atau spasi.",
  },
] as const;

export function SubmissionChecklist() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const checkedCount = CHECKLIST_ITEMS.filter((item) => checkedItems[item.id]).length;
  const isAllChecked = checkedCount === CHECKLIST_ITEMS.length;

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <Card className="gap-0 border-muted-foreground/20 py-0">
      <CardHeader className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ListChecks className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base">Daftar Periksa Sebelum Kirim</CardTitle>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={isAllChecked ? "default" : "secondary"}
              className={cn("font-mono text-xs", isAllChecked && "bg-emerald-600 text-white hover:bg-emerald-600/90")}
            >
              {isAllChecked && <CheckCircle2 className="mr-1 size-3" />}
              {checkedCount} dari {CHECKLIST_ITEMS.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4">
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const isChecked = Boolean(checkedItems[item.id]);

            return (
              <div key={item.id} className="flex items-start gap-2.5">
                <Checkbox
                  id={`checklist-${item.id}`}
                  checked={isChecked}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor={`checklist-${item.id}`}
                  className={cn(
                    "cursor-pointer font-normal text-xs leading-relaxed sm:text-sm",
                    isChecked && "text-muted-foreground line-through",
                  )}
                >
                  {item.label}
                </Label>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
