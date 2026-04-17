export type ThreadsPerSegment = 75 | 100;

export const DEFAULT_THREADS_PER_SEGMENT: ThreadsPerSegment = 75;
export const THREADS_PER_SEGMENT_COOKIE = "dr_threads_per_segment";
export const THREADS_PER_SEGMENT_CONFIG_KEY = "threads_per_screen";

export function parseThreadsPerSegment(value: string | null | undefined): ThreadsPerSegment {
  if (value === "100") {
    return 100;
  }

  return DEFAULT_THREADS_PER_SEGMENT;
}
