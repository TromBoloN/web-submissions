import { Skeleton } from "@/components/ui/skeleton";

/** Generic route-level fallback: page heading, a row of stat tiles and a content block. */
export function PageLoadingSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Memuat halaman…</span>

      <div className="space-y-2">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>

      <div className="space-y-3">
        {["a", "b", "c", "d", "e"].map((key) => (
          <Skeleton key={key} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
