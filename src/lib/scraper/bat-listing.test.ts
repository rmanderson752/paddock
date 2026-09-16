import { describe, it, expect } from "vitest";
import { parseBaTListingPage, listingContentHash } from "./bat-listing";

// A trimmed page with the same structure as a real listing
const PAGE = `<!doctype html><html><head>
<title>24-Years-Owned 1990 Porsche 911 Carrera 2 Cabriolet 5-Speed for sale on BaT Auctions - closed on September 15, 2026 (Lot #263,130) |  Bring a Trailer</title>
<meta property="og:title" content="24-Years-Owned 1990 Porsche 911 Carrera 2 Cabriolet 5-Speed" />
</head><body>
<div class="post-excerpt" tabindex="0">
  <p>This 1990 Porsche 911 Carrera 2 cabriolet was purchased by the current owner in 2002 and was specified in Slate Grey Metallic over Silk Grey Special leather.</p>
  <p><span><img src="x.jpg" /></span></p>
  <p>The car is finished in Slate Grey Metallic &amp; features a GAHH replacement gray soft top.</p>
  <div id="carfax-snapshot"></div>
  <p>The Carfax report is free of accidents or other reported damage.</p>
</div>
<div class="site-modal"><div class="post-excerpt"><p>Did you mean to enter this number as a bid? If so please use the bidding box above.</p></div></div>
<div class="essentials">
  <h2 class="title">BaT Essentials</h2>
  <div class="item item-seller"><strong>Seller</strong>: <a href="/member/x/">RevOn_Auto</a></div>
  <strong>Location</strong>: <a href="https://maps.example/x" target="_blank">Seabrook, New Hampshire 03874</a>
  <div class="item"><strong>Listing Details</strong><ul>
    <li>Chassis: <a href="https://google.example/?q=WP0CB2962LS471196">WP0CB2962LS471196</a></li>
    <li>115k Miles Shown on Repaired Odometer</li>
    <li>Five-Speed Manual Transaxle</li>
    <li>17&#8221; Turbo Twists-style Wheels</li>
  </ul></div>
  <div class="item additional"><strong>Private Party or Dealer</strong>: Private Party</div>
  <div class="item"><strong>Lot</strong> #263130</div>
</div>
<div class="share-auction-ctrl" data-item-title="24-Years-Owned 1990 Porsche 911 Carrera 2 Cabriolet 5-Speed" data-item-url="/listing/x/"></div>
</body></html>`;

describe("parseBaTListingPage", () => {
  const listing = parseBaTListingPage(PAGE);

  it("reads the title from the share control", () => {
    expect(listing.title).toBe("24-Years-Owned 1990 Porsche 911 Carrera 2 Cabriolet 5-Speed");
  });

  it("collects the essentials bullets in order, entity-decoded", () => {
    expect(listing.essentials).toEqual([
      "Chassis: WP0CB2962LS471196",
      "115k Miles Shown on Repaired Odometer",
      "Five-Speed Manual Transaxle",
      "17” Turbo Twists-style Wheels",
    ]);
  });

  it("joins the description paragraphs, ignoring image-only ones and the comment modals", () => {
    expect(listing.description).not.toContain("bidding box");
    const paragraphs = listing.description.split("\n\n");
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[1]).toBe("The car is finished in Slate Grey Metallic & features a GAHH replacement gray soft top.");
    expect(paragraphs[2]).toMatch(/^The Carfax report/);
  });

  it("pulls VIN, lot, seller type and location", () => {
    expect(listing.vin).toBe("WP0CB2962LS471196");
    expect(listing.lotNumber).toBe("263130");
    expect(listing.sellerType).toBe("private_party");
    expect(listing.location).toBe("Seabrook, New Hampshire 03874");
  });

  it("falls back to the <title> when the share control is missing", () => {
    const stripped = PAGE.replace(/data-item-title="[^"]*"/, "").replace(/<meta property="og:title"[^>]*>/, "");
    expect(parseBaTListingPage(stripped).title).toBe("24-Years-Owned 1990 Porsche 911 Carrera 2 Cabriolet 5-Speed");
  });

  it("tolerates a page with no essentials or description", () => {
    const bare = parseBaTListingPage("<html><head><title>1975 Ford Bronco for sale on BaT Auctions</title></head><body></body></html>");
    expect(bare.title).toBe("1975 Ford Bronco");
    expect(bare.essentials).toEqual([]);
    expect(bare.description).toBe("");
    expect(bare.vin).toBeNull();
    expect(bare.sellerType).toBeNull();
  });

  it("hashes the extractor-visible text only", () => {
    const a = listingContentHash(listing);
    const b = listingContentHash({ title: listing.title, essentials: [...listing.essentials], description: listing.description });
    const c = listingContentHash({ ...listing, description: listing.description + " x" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
