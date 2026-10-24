"use client";

import { useState } from "react";

import { cn } from "cn";
import { CheckCircle2, ChevronDown, ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

type SubmissionChecklistProps = {
  isSubmitted: boolean;
};

export function SubmissionChecklist({ isSubmitted }: SubmissionChecklistProps) {
  // Ditutup secara default jika status sudah 'submitted'
  const [isOpen, setIsOpen] = useState(!isSubmitted);
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
    <Card className="border-muted-foreground/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ListChecks className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base">Daftar Periksa Sebelum Kirim</CardTitle>
                <CardDescription className="text-xs">
                  Panduan verifikasi mandiri sebelum mengumpulkan berkas akhir.
                </CardDescription>
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

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="size-8 p-0">
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  />
                  <span className="sr-only">Buka atau tutup daftar periksa</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0 pb-4 sm:pb-5">
            <p className="text-muted-foreground text-xs">
              Centang daftar berikut untuk memastikan berkas tim Anda siap dinilai. Checklist ini bersifat opsional,
              hanya tersimpan di peramban, dan tidak menghalangi penyimpanan atau pengiriman.
            </p>

            <div className="space-y-2.5 rounded-lg border bg-muted/20 p-3 sm:p-4">
              {CHECKLIST_ITEMS.map((item, index) => {
                const isChecked = Boolean(checkedItems[item.id]);

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-2.5 rounded-md p-1.5 transition-colors hover:bg-muted/40"
                  >
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
                      <span className="mr-1.5 font-medium text-muted-foreground">{index + 1}.</span>
                      {item.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
