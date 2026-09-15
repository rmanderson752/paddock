import { Skeleton } from "@/components/ui/Skeleton";

export default function ProtectedLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:pb-6">
      <Skeleton className="h-8 w-40 mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
