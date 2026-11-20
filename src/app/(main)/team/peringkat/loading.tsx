import { Skeleton } from "@/components/ui/skeleton";

export default function TeamPeringkatLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
      <div className="space-y-2">
        {["a", "b", "c", "d", "e", "f"].map((key) => (
          <Skeleton key={key} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
