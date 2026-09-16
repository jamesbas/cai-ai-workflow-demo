import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./env";

loadEnv();

const OUTPUT_DIR = path.join(process.cwd(), "screenshots");
const VIEWPORT = { width: 1920, height: 1080 };

interface HealthResponse {
  status: string;
  fixtureMode: boolean;
  demoMode: boolean;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const baseUrl =
    args.find((arg) => !arg.startsWith("--")) ??
    process.env.SCREENSHOT_BASE_URL ??
    "http://localhost:3000";
  return { baseUrl: baseUrl.replace(/\/+$/, ""), allowFixture: args.includes("--allow-fixture") };
}

async function main() {
  const { baseUrl, allowFixture } = parseArgs();

  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("Playwright is not installed. Run:\n  npm install\n  npx playwright install chromium");
    process.exit(1);
  }

  console.log(`Target   : ${baseUrl}`);
  console.log(`Output   : ${OUTPUT_DIR}`);

  const health = (await (await fetch(`${baseUrl}/api/health`)).json()) as HealthResponse;
  if (health.fixtureMode && !allowFixture) {
    console.error(
      "\nThe target is running in FIXTURE MODE. Screenshots would show the 'FIXTURE MODE'\n" +
        "banner and pre-recorded output, which must never stand in for the live demo.\n" +
        "Set DEMO_FIXTURE_MODE=false, or pass --allow-fixture if this is intentional.",
    );
    process.exit(1);
  }
  console.log(`Health   : ${health.status} (fixtureMode=${health.fixtureMode})`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });

  // Each capture is a full viewport shot so the fallback matches what the room sees.
  const shot = async (name: string) => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, name) });
    console.log(`  wrote ${name}`);
  };

  const scrollTo = async (index: number) => {
    await page.locator("main section").nth(index).evaluate((element) => {
      element.scrollIntoView({ block: "start" });
      window.scrollBy(0, -16);
    });
    await page.waitForTimeout(300);
  };

  try {
    await page.request.post(`${baseUrl}/api/demo/reset`);
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

    // 1 - intake with the keynote sample loaded
    await page.waitForSelector("button:has-text('Use keynote sample')");
    await page.locator("button:has-text('Use keynote sample')").dispatchEvent("click");
    await page.waitForSelector("img[alt='Resident submitted maintenance photo']");
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot("01-intake.png");

    // Run the workflow
    await page.locator("button:has-text('Submit request')").dispatchEvent("click");
    await page.waitForSelector("button:has-text('Analyze Request')", { timeout: 30_000 });
    await page.locator("button:has-text('Analyze Request')").dispatchEvent("click");
    await page.waitForSelector("text=From association records", { timeout: 120_000 });
    await page.waitForTimeout(1_000);

    // 2 - AI analysis, observed vs reported
    await scrollTo(1);
    await shot("02-ai-analysis.png");

    // 3 - connected association context
    await scrollTo(2);
    await shot("03-connected-context.png");

    // 4 - the data boundary panel, expanded
    const contextUsed = page.locator("summary:has-text('Context Used')");
    await contextUsed.dispatchEvent("click");
    await page.waitForTimeout(300);
    await contextUsed.evaluate((element) => {
      element.scrollIntoView({ block: "start" });
      window.scrollBy(0, -16);
    });
    await shot("04-context-used.png");
    await contextUsed.dispatchEvent("click");
    await page.waitForTimeout(300);

    // 5 - draft work order
    await scrollTo(3);
    await shot("05-draft-work-order.png");

    // 6 - human review with the override staged but not yet submitted
    const review = page.locator("main section").nth(4);
    await review.locator("select").first().selectOption("URGENT");
    await review
      .locator("textarea")
      .last()
      .fill("Youth swim program begins shortly; gate must be secured before pool opening.");
    await scrollTo(4);
    await shot("06-human-review.png");

    // 7 - approved, dispatch suppressed
    await review.getByRole("button", { name: "Approve", exact: true }).dispatchEvent("click");
    await page.waitForSelector("text=external dispatch suppressed", { timeout: 60_000 });
    await page.waitForTimeout(800);
    await scrollTo(4);
    await shot("07-approved.png");

    // 8 and 9 - element shots so the whole timeline and the metrics block are legible
    const audit = page.locator("main section").nth(5);
    await audit
      .locator("ol")
      .screenshot({ path: path.join(OUTPUT_DIR, "08-audit-trail.png"), scale: "css" });
    console.log("  wrote 08-audit-trail.png");

    await audit
      .locator("div.grid")
      .first()
      .screenshot({ path: path.join(OUTPUT_DIR, "09-metrics.png"), scale: "css" });
    console.log("  wrote 09-metrics.png");

    console.log("\nAll nine screenshots captured.");
    console.log("Review them before the keynote: they are the only on-stage fallback.");
  } finally {
    await browser.close();
  }
}

void main();
