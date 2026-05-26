import { FeedClient } from "@/components/FeedClient";
import { getFeedData } from "@/lib/feed";

export const dynamic = "force-dynamic";

export default async function Home() {
  const feedData = await getFeedData();

  return <FeedClient initialData={feedData} />;
}
