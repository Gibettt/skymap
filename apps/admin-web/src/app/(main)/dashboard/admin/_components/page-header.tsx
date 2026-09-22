import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="break-words font-heading font-medium text-xl tracking-tight sm:text-2xl">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {action && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{action}</div>}
    </div>
  );
}
