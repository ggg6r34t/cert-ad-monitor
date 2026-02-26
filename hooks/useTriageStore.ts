"use client";

import { useMemo, useState } from "react";
import type { TriageStatus } from "@/types";

export function useTriageStore(seed: Record<string, TriageStatus>, loaded: boolean) {
  const [overrides, setOverrides] = useState<Record<string, TriageStatus>>({});

  const triageMap = useMemo(
    () => ({ ...(loaded ? seed : {}), ...overrides }),
    [loaded, overrides, seed]
  );

  const setTriage = (key: string, status: TriageStatus) => {
    setOverrides((prev) => ({ ...prev, [key]: status }));
  };

  return {
    triageMap,
    setTriage,
  };
}
