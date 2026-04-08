import * as cheerio from "cheerio";
import { proxifySource } from "../lib/proxy";
import { DirectSource } from "../lib/types";
import { getAsCdnSource } from "../lib/acdn-top";
import { getRubystmSource } from "../lib/rubystm";

// Set to true to use proxy for direct sources, false to return direct URLs
const PROXIFY = false;

const embedPlayerOrigins = {
    asCdnOrigin: "https://as-cdn21.top",
    rubyStreamOrigin: "https://rubystm.com"
}

export async function getPlayerIframeUrls(toonStreamIframeUrls: string[]) {
    const playerIframeUrls = []
    for (const url of toonStreamIframeUrls) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Error fetching player-iframe url from - ${url} `);

            const html = await res.text();
            const $ = cheerio.load(html);

            const iframeUrl = $(".Video iframe").attr("src");
            if (!iframeUrl) continue;

            playerIframeUrls.push(iframeUrl);
        } catch (err) {
            console.log("Error:", err);
        }
    }

    console.log(`Scraped ${playerIframeUrls.length} player iframe url(s)`);
    return playerIframeUrls;
}

const { asCdnOrigin, rubyStreamOrigin } = embedPlayerOrigins

export async function getDirectSources(playerIframeUrls: string[]) {
    const directSources: DirectSource[] = [];

    for (const url of playerIframeUrls) {
        try {
            if (url.startsWith(asCdnOrigin)) {
                const src = await getAsCdnSource(url);
                if (src) {
                    directSources.push(src);
                }
            }
            else if (url.startsWith(rubyStreamOrigin)) {
                const src = await getRubystmSource(url);
                if (src) {
                    directSources.push(src);
                }
            }
            else
                console.log("No source-scraper found for", url, "- skipping");

        } catch (err) {
            console.log("Error:", err);
        }
    }

    console.log(`Successfully Scraped ${directSources.length} direct source(s)`);

    if (PROXIFY) {
        return directSources.map(src => proxifySource(src))
    } else {
        return directSources;
    }
}