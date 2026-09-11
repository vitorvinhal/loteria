"use client";

import { APP_VERSION } from "@/lib/version";

export function VersionBadge() {
  return (
    <div className="fixed bottom-3 right-3 z-50">
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-muted/80 text-muted-foreground border border-border/50 backdrop-blur-sm select-none">
        v{APP_VERSION}
      </span>
    </div>
  );
}
