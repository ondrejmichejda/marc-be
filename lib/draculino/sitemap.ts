import { DRACULINO_BRANCHES } from "./data";
import { SitemapItem } from "./types";

/**
 * Returns the sitemap of gym locations and timetables based purely on local static data.ts.
 * No external network fetch or scraping is performed; data.ts is the source of truth.
 */
export function getDraculinoSitemap(): SitemapItem[] {
  return DRACULINO_BRANCHES.map((branch) => {
    let status: SitemapItem["status"] = "active";
    if (
      branch.url.includes("draculinokromeriz.cz") ||
      branch.url.includes("draculinozlin.cz")
    ) {
      status = "external";
    }

    return {
      branchId: branch.id,
      branchName: branch.name,
      pageUrl: branch.url,
      timetableUrl: branch.timetableImageUrl,
      hasSchedule: Boolean(
        branch.schedule &&
          Object.values(branch.schedule).some((units) => units.length > 0)
      ),
      status,
      lastChecked: new Date().toISOString(),
    };
  });
}

/**
 * Kept for async compatibility; returns static sitemap items from data.ts without remote fetching.
 */
export async function fetchDraculinoSitemap(): Promise<SitemapItem[]> {
  return getDraculinoSitemap();
}
