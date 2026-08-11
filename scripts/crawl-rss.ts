import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { backfillThumbnails, runCrawler } = await import("../lib/crawler");

  if (process.argv.includes("--backfill-thumbnails")) {
    const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="));
    const sourceArgument = process.argv.find((argument) => argument.startsWith("--source="));
    const requestedLimit = Number(limitArgument?.slice("--limit=".length) || 80);
    const limit = Number.isFinite(requestedLimit) ? requestedLimit : 80;
    const sourceId = sourceArgument?.slice("--source=".length);
    const dryRun = process.argv.includes("--dry-run");
    const result = await backfillThumbnails({
      limit,
      sourceId,
      dryRun,
      onProgress: console.log,
    });

    console.log(
      `Backfill complete: checked ${result.checked}, found ${result.found}, updated ${result.updated}${result.dryRun ? " (dry run)" : ""}.`,
    );
    return;
  }

  const summary = await runCrawler();
  for (const source of summary.sources) {
    if (source.status === "success") {
      console.log(`${source.sourceName}: found ${source.found}, saved ${source.saved}`);
    } else {
      console.error(`${source.sourceName}: ${source.error}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
