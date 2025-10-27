"use client";

import { Icons } from "@/components/ui/icons";

export function OpenSearchButton() {
  return (
    <button
      type="button"
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => {
        // Placeholder - will implement search modal later
      }}
    >
      <Icons.Search size={16} />
      <span className="hidden md:inline">Search...</span>
    </button>
  );
}
