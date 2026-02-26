import type { MetaAd, FetchAdsResult } from "@/types";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().split("T")[0];
}

export function generateDemoData(query: string): FetchAdsResult {
  const slug = query.toLowerCase().replace(/\s/g, "");
  const first = query.split(" ")[0];

  const ads: MetaAd[] = [
    {
      id: "demo_1",
      page_name: `${query} Fans Official`,
      page_id: "fake_p1",
      ad_creation_time: daysAgo(3),
      ad_delivery_start_time: daysAgo(3),
      ad_delivery_stop_time: null,
      ad_creative_bodies: [
        `FREE ${query} giveaway!! Click NOW to claim your prize! Limited time only! Join our WhatsApp group to participate`,
      ],
      ad_creative_link_captions: [`${slug}-free-gifts.xyz`],
      ad_creative_link_titles: [`${query} GIVEAWAY`],
      ad_creative_link_descriptions: ["You have been selected as a winner! Congratulations!"],
      publisher_platforms: ["facebook"],
      impressions: { lower_bound: "500", upper_bound: "2000" },
    },
    {
      id: "demo_2",
      page_name: `${query} Support Center`,
      page_id: "fake_p2",
      ad_creation_time: daysAgo(1),
      ad_delivery_start_time: daysAgo(1),
      ad_delivery_stop_time: null,
      ad_creative_bodies: [
        `Your ${query} account has been suspended. Verify your identity and confirm your login credentials immediately to restore access.`,
      ],
      ad_creative_link_captions: [`${slug}-verify.click`],
      ad_creative_link_titles: ["Account Verification Required"],
      ad_creative_link_descriptions: ["Confirm your account details now"],
      publisher_platforms: ["facebook"],
      impressions: { lower_bound: "200", upper_bound: "800" },
    },
    {
      id: "demo_3",
      page_name: `${first} Investment Hub`,
      page_id: "fake_p3",
      ad_creation_time: daysAgo(5),
      ad_delivery_start_time: daysAgo(5),
      ad_delivery_stop_time: null,
      ad_creative_bodies: [
        `Earn $2500/day with ${query} trading bot! Guaranteed returns! Act now! Secret method revealed!`,
      ],
      ad_creative_link_captions: [`${slug}-invest.top`],
      ad_creative_link_titles: ["Make Money Fast"],
      ad_creative_link_descriptions: ["Guaranteed ROI"],
      publisher_platforms: ["facebook", "instagram"],
      impressions: { lower_bound: "1000", upper_bound: "5000" },
    },
    {
      id: "demo_4",
      page_name: `${query} Customer Service`,
      page_id: "fake_p4",
      ad_creation_time: daysAgo(2),
      ad_delivery_start_time: daysAgo(2),
      ad_delivery_stop_time: null,
      ad_creative_bodies: [
        `Having issues with ${query}? Our support team is here to help. Call now at 1-800-555-0199 or click to chat on Telegram.`,
      ],
      ad_creative_link_captions: ["bit.ly/2xF4k3"],
      ad_creative_link_titles: [`${query} Help Desk`],
      ad_creative_link_descriptions: ["24/7 customer service"],
      publisher_platforms: ["facebook"],
      impressions: { lower_bound: "100", upper_bound: "500" },
    },
    {
      id: "demo_5",
      page_name: `${slug}officiel`,
      page_id: "fake_p5",
      ad_creation_time: daysAgo(7),
      ad_delivery_start_time: daysAgo(7),
      ad_delivery_stop_time: null,
      ad_creative_bodies: [
        `Claim your exclusive ${query} reward! You have been selected for a special bonus. Redeem now before it expires!`,
      ],
      ad_creative_link_captions: [`${slug}-rewards.icu`],
      ad_creative_link_titles: ["Exclusive Reward"],
      ad_creative_link_descriptions: ["Activate your bonus"],
      publisher_platforms: ["facebook", "instagram"],
      impressions: { lower_bound: "300", upper_bound: "1200" },
    },
    {
      id: "demo_6",
      page_name: "Tech News Daily",
      page_id: "unrelated_p6",
      ad_creation_time: daysAgo(10),
      ad_delivery_start_time: daysAgo(10),
      ad_delivery_stop_time: null,
      ad_creative_bodies: [`Independent review of ${query} products.`],
      ad_creative_link_captions: ["technewsdaily.com"],
      ad_creative_link_titles: ["Product Reviews"],
      ad_creative_link_descriptions: ["Honest reviews"],
      publisher_platforms: ["facebook"],
      impressions: { lower_bound: "5000", upper_bound: "15000" },
    },
    {
      id: "demo_7",
      page_name: query,
      page_id: "maybe_legit_p7",
      ad_creation_time: daysAgo(14),
      ad_delivery_start_time: daysAgo(14),
      ad_delivery_stop_time: null,
      ad_creative_bodies: [`Shop the official ${query} spring collection.`],
      ad_creative_link_captions: [`${slug}.com`],
      ad_creative_link_titles: [`${query} Official`],
      ad_creative_link_descriptions: ["Shop now"],
      publisher_platforms: ["facebook", "instagram"],
      impressions: { lower_bound: "10000", upper_bound: "50000" },
    },
  ];

  return { ads, error: null, isDemo: true };
}