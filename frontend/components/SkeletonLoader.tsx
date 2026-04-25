export function SkeletonLoader() {
  return (
    <div className="grid gap-4">
      <div className="h-28 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-white/10" />
      <div className="h-28 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-white/10" />
      <div className="h-28 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-white/10" />
    </div>
  );
}
