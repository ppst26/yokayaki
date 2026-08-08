import * as React from "react";
import { cn } from "@/lib/utils";

interface TableProps extends React.ComponentProps<"table"> {
  containerClassName?: string;
}

function Table({ className, containerClassName, ...props }: TableProps) {
  return (
    <div className={cn("relative w-full overflow-x-auto rounded-sm bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 shadow-2xs", containerClassName)}>
      <table
        className={cn("w-full min-w-full text-left border-collapse", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn(
        "bg-neutral-800 text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-none",
        className
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      className={cn(
        "divide-y divide-slate-100 dark:divide-neutral-800 text-sm font-semibold text-slate-800 dark:text-neutral-200",
        className
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "hover:bg-slate-50/50 dark:hover:bg-neutral-800/50 transition-colors",
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "p-3.5 sm:p-4 bg-neutral-800 text-white font-black align-middle whitespace-nowrap first:rounded-tl-sm last:rounded-tr-sm",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn("p-3.5 sm:p-4 align-middle whitespace-nowrap", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
};
