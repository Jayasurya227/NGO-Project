/**
 * Starts ALL agent workers in a single process.
 * Run from repo root: pnpm workers
 */
import "./load-env";

// Each import self-starts its worker and recovery timers
import "./workers/requirement-extraction.worker";
import "./workers/gap-analysis.worker";
import "./workers/initiative-matching.worker";
import "./workers/pitch-deck.worker";
import "./workers/initiative-embedding.worker";

console.log("\n✅ All 5 workers running. Press Ctrl+C to stop.\n");

// Keep the process alive while workers wait for jobs
setInterval(() => {}, 30_000);

process.on("SIGINT", () => {
  console.log("\nShutting down workers...");
  process.exit(0);
});
