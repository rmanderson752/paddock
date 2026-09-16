/**
 * Bring a Trailer listing pages — server-only.
 *
 * The model pages the scraper walks only carry a one-line excerpt per
 * auction. The listing page itself has the full write-up plus a "BaT
 * Essentials" panel (chassis, odometer, drivetrain, colours, seller type).
 * That text is what the extraction pipeline reads, so it is fetched once per
 * sale and stored in `sale_listings`.
 */

import * as cheerio from "cheerio";
import { createHash } from "crypto";

export interface ParsedListing {
  title: string;
  /** "BaT Essentials" bullets, in page order */
  essentials: string[];
  /** Body paragraphs joined with blank lines; empty when the page had none */
  description: string;
  vin: string | null;
  lotNumber: string | null;
  sellerType: "private_party" | "dealer" | null;
  location: string | null;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Parse a listing page. Tolerant of missing sections — an old or unusual page
 * still yields a title and whatever text was found.
 */
export function parseBaTListingPage(html: string): ParsedListing {
  const $ = cheerio.load(html);

  const title =
    clean($("[data-item-title]").first().attr("data-item-title") ?? "") ||
    clean($('meta[property="og:title"]').attr("content") ?? "") ||
    clean($("title").text()).replace(/\s+for sale on BaT Auctions.*$/i, "");

  const essentials: string[] = [];
  $(".essentials .item ul li").each((_, li) => {
    const text = clean($(li).text());
    if (text) essentials.push(text);
  });

  // The page reuses .post-excerpt for its comment modals; the listing body
  // is the first one
  const paragraphs: string[] = [];
  $(".post-excerpt")
    .first()
    .find("p")
    .each((_, p) => {
      const text = clean($(p).text());
      if (text) paragraphs.push(text);
    });

  const vinItem = essentials.find((e) => /^(chassis|vin)\s*:/i.test(e));
  const vin = vinItem ? clean(vinItem.replace(/^(chassis|vin)\s*:/i, "")) || null : null;

  let lotNumber: string | null = null;
  $(".essentials .item").each((_, el) => {
    const text = clean($(el).text());
    const m = text.match(/^Lot\s*#\s*([\d,]+)/i);
    if (m) lotNumber = m[1].replace(/,/g, "");
  });

  let sellerType: ParsedListing["sellerType"] = null;
  $(".essentials .item").each((_, el) => {
    const text = clean($(el).text());
    const m = text.match(/Private Party or Dealer\s*:\s*(.+)$/i);
    if (m) sellerType = /dealer/i.test(m[1]) ? "dealer" : "private_party";
  });

  let location: string | null = null;
  const essentialsText = $(".essentials").html() ?? "";
  const locMatch = essentialsText.match(/<strong>Location<\/strong>\s*:\s*<a[^>]*>([^<]+)<\/a>/i);
  if (locMatch) location = clean(cheerio.load(`<x>${locMatch[1]}</x>`)("x").text()) || null;

  return {
    title,
    essentials,
    description: paragraphs.join("\n\n"),
    vin,
    lotNumber,
    sellerType,
    location,
  };
}

/** Stable fingerprint of the text the extractor will read. */
export function listingContentHash(parts: { title: string; essentials: string[]; description: string }): string {
  return createHash("sha256")
    .update(parts.title)
    .update("\n")
    .update(parts.essentials.join("\n"))
    .update("\n")
    .update(parts.description)
    .digest("hex");
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export type FetchListingResult =
  | { ok: true; listing: ParsedListing }
  | { ok: false; status: number | "network"; retryable: boolean };

/**
 * Fetch and parse one listing page. Rate limiting and retries belong to the
 * caller (see `fetchMissingListings`) so a backfill and a refresh can pace
 * themselves differently.
 */
export async function fetchBaTListing(url: string, fetchImpl: typeof fetch = fetch): Promise<FetchListingResult> {
  try {
    const res = await fetchImpl(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      return { ok: false, status: res.status, retryable: res.status === 429 || res.status >= 500 };
    }
    const html = await res.text();
    const listing = parseBaTListingPage(html);
    if (!listing.title) return { ok: false, status: res.status, retryable: false };
    return { ok: true, listing };
  } catch {
    return { ok: false, status: "network", retryable: true };
  }
}
