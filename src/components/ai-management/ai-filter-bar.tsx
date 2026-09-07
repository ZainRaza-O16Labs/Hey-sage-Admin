"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

type FilterOption = { value: string; label: string };

export function AIFilterBar({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions = [
    { value: "all", label: "All statuses" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ],
  lifecycleFilter,
  onLifecycleFilterChange,
  lifecycleOptions,
  searchPlaceholder = "Search...",
  searchLabel = "Search",
}: {
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  statusOptions?: FilterOption[];
  lifecycleFilter?: string;
  onLifecycleFilterChange?: (value: string) => void;
  lifecycleOptions?: FilterOption[];
  searchPlaceholder?: string;
  searchLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
          className="pl-8"
        />
      </div>
      <NativeSelect
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        aria-label="Filter by status"
        className="sm:w-36"
      >
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </NativeSelect>
      {lifecycleFilter !== undefined &&
      onLifecycleFilterChange &&
      lifecycleOptions ? (
        <NativeSelect
          value={lifecycleFilter}
          onChange={(e) => onLifecycleFilterChange(e.target.value)}
          aria-label="Filter by lifecycle"
          className="sm:w-36"
        >
          {lifecycleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </NativeSelect>
      ) : null}
    </div>
  );
}
