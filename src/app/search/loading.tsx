import { Skeleton } from "@/components/ui/Skeleton";

export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:pb-6">
      <Skeleton className="h-8 w-32 mb-4" />
      <Skeleton className="h-10 w-full rounded-lg mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
