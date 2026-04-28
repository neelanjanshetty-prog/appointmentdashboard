import { Badge } from "@/components/Badge";

export function PageHeader({
  title,
  description,
  badge,
  action
}: {
  title: string;
  description: string;
  badge?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {badge ? <Badge>{badge}</Badge> : null}
        <h2 className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-200">{description}</p>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
