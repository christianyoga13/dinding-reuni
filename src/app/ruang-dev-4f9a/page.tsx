import type { Metadata } from "next";
import { cookies } from "next/headers";

import DevControlPanel from "./dev-control-panel";
import {
  parseThreadsPerSegment,
  THREADS_PER_SEGMENT_COOKIE,
} from "@/lib/thread-layout";

export const metadata: Metadata = {
  title: "Dev Control",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DevControlPage() {
  const cookieStore = await cookies();
  const initialThreadsPerSegment = parseThreadsPerSegment(
    cookieStore.get(THREADS_PER_SEGMENT_COOKIE)?.value
  );

  return <DevControlPanel initialThreadsPerSegment={initialThreadsPerSegment} />;
}
