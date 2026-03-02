import { useEffect, useState } from "react";
import { MIN_SKELETON_DELAY_MS } from "../lib/constants";

export function useMinSkeletonDelay() {
  const [minDelayDone, setMinDelayDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setMinDelayDone(true),
      MIN_SKELETON_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  return minDelayDone;
}
