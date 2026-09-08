import { config } from "dotenv";

config({ path: ".env.local" });

import { addXQuoteFromUrl } from "../lib/x-quotes";

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: npm run add:x-quote -- <tweet-url>");
    process.exit(1);
  }

  const result = await addXQuoteFromUrl(url);
  console.log(`Saved @${result.author_handle}'s tweet (${result.tweet_id}) to x_quotes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
