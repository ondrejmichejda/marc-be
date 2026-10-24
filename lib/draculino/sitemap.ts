import { DRACULINO_BRANCHES } from "./data";
import { SitemapItem } from "./types";

const SITEMAP_URL = "https://www.draculino.cz/wp-sitemap-posts-page-1.xml";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Fetches and resolves the sitemap of gym locations and timetables from www.draculino.cz.
 */
export async function fetchDraculinoSitemap(): Promise<SitemapItem[]> {
  const discoveredUrls = new Set<string>();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(SITEMAP_URL, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const xml = await res.text();
      const locMatches = [...xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi)];
      for (const m of locMatches) {
        discoveredUrls.add(m[1].toLowerCase().replace(/\/+$/, ""));
      }
    }
  } catch (error) {
    console.warn(
      `[DraculinoSitemap] Could not fetch live sitemap XML, using static index:`,
      (error as Error).message
    );
  }

  const sitemapItems: SitemapItem[] = DRACULINO_BRANCHES.map((branch) => {
    const normalizedUrl = branch.url.toLowerCase().replace(/\/+$/, "");
    const isPresentInSitemap =
      discoveredUrls.size === 0 || discoveredUrls.has(normalizedUrl);

    let status: SitemapItem["status"] = "active";
    if (branch.url.includes("draculinokromeriz.cz") || branch.url.includes("draculinozlin.cz")) {
      status = "external";
    } else if (!isPresentInSitemap && discoveredUrls.size > 0) {
      status = "not_found";
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

  return sitemapItems;
}
