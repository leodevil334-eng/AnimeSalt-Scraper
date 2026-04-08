import * as cheerio from "cheerio";
import { DirectSource } from "./types";

const TOONSTREAM_BASE = "https://toonstream.dad";

const UserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";

const embedPlayerOrigins = {
  asCdnOrigin: "https://as-cdn21.top",
  rubyStreamOrigin: "https://rubystm.com",
  cloudyUpnOrigin: "https://cloudy.upns.one",
};

/**
 * Standard Dean Edwards Unpacker Algorithm
 */
function unpack(p: string, a: number, c: number, k: string[]): string {
  while (c--) {
    if (k[c]) {
      p = p.replace(new RegExp("\\b" + c.toString(a) + "\\b", "g"), k[c]);
    }
  }
  return p;
}

/**
 * Extract packed args safely
 */
function extractPackedArgs(text: string) {
  try {
    const packerSignature = "eval(function(p,a,c,k,e,d)";
    const startIdx = text.indexOf(packerSignature);
    if (startIdx === -1) return null;

    const endIdx = text.lastIndexOf(".split('|'))");
    if (endIdx === -1) return null;

    const functionEnd = text.indexOf("}", startIdx);
    const argsStart = text.indexOf("(", functionEnd);

    const argsBody = text.substring(argsStart + 1, endIdx);

    const lastComma = argsBody.lastIndexOf(",");
    const kRaw = argsBody.substring(lastComma + 1);
    const k = kRaw.replace(/^['"]|['"]$/g, "").split("|");

    const secondLastComma = argsBody.lastIndexOf(",", lastComma - 1);
    const c = parseInt(argsBody.substring(secondLastComma + 1, lastComma));

    const thirdLastComma = argsBody.lastIndexOf(",", secondLastComma - 1);
    const a = parseInt(
      argsBody.substring(thirdLastComma + 1, secondLastComma)
    );

    const pRaw = argsBody.substring(0, thirdLastComma);
    const p = pRaw.trim().replace(/^['"]|['"]$/g, "");

    return { p, a, c, k };
  } catch (e) {
    console.error("[StreamRuby] Manual extraction failed:", e);
    return null;
  }
}

/**
 * Main Scraper
 */
export async function getRubystmSource(
  url: string
): Promise<DirectSource | null> {
  const segments = url.replace(".html", "").split("/");
  const file_code = segments.pop() || segments.pop();

  if (!file_code) {
    console.log("[StreamRuby] Couldnt extract file_code from", url);
    return null;
  }

  const res = await fetch(
    `${embedPlayerOrigins.rubyStreamOrigin}/dl`,
    {
      method: "POST",
      cache: "no-store", // 🚀 disable cache
      body: `op=embed&file_code=${file_code}&auto=1&referer=${encodeURIComponent(
        TOONSTREAM_BASE + "/"
      )}`,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Referer: url,
        "User-Agent": UserAgent,
      },
    }
  );

  if (!res.ok) {
    console.log(`[StreamRuby Error] Fetch failed: ${res.status}`);
    return null;
  }

  const html = await res.text();
  return scrapeStreamRuby(html);
}

/**
 * Parser
 */
export function scrapeStreamRuby(html: string): DirectSource | null {
  const $ = cheerio.load(html);
  let unpacked: string | null = null;

  const scripts = $("script").toArray();

  for (const el of scripts) {
    const text = $(el).html();
    if (text && text.startsWith("eval(function(p,a,c,k,e,d)")) {
      const args = extractPackedArgs(text);
      if (args) {
        unpacked = unpack(args.p, args.a, args.c, args.k);
        break;
      }
    }
  }

  if (!unpacked) {
    console.log("[StreamRuby Error] Failed to unpack JS.");
    return null;
  }

  // Extract m3u8
  const hlsMatch = unpacked.match(
    /file\s*:\s*(['"])(https?:\/\/[^"']+\.m3u8[^"']*)\1/
  );
  if (!hlsMatch) {
    console.log("[StreamRuby Error] No m3u8 found.");
    return null;
  }

  // Poster
  const coverMatch = unpacked.match(
    /image\s*:\s*(['"])(https?:\/\/[^"']+\.jpg)\1/
  );

  let subtitleObj = undefined;
  let spriteUrl = undefined;

  const objectRegex = /\{([^{}]*?)\}/g;
  let objMatch;

  while ((objMatch = objectRegex.exec(unpacked)) !== null) {
    const content = objMatch[1];

    const kindMatch = content.match(/kind\s*:\s*(['"])([^"']+)\1/);
    const fileMatch = content.match(/file\s*:\s*(['"])([^"']+)\1/);
    const labelMatch = content.match(/label\s*:\s*(['"])([^"']+)\1/);

    if (kindMatch && fileMatch) {
      const kind = kindMatch[2];
      const url = fileMatch[2];
      const label = labelMatch ? labelMatch[2] : "Unknown";

      if (kind === "thumbnails" && !spriteUrl) {
        spriteUrl = url;
      } else if (kind === "captions") {
        if (!subtitleObj || label.toLowerCase().includes("eng")) {
          subtitleObj = { label, url };
        }
      }
    }
  }

  return {
    label: "Ruby",
    type: "hls",
    url: hlsMatch[2],
    cover: coverMatch ? coverMatch[2] : undefined,
    thumbnail: spriteUrl,
    subtitles: subtitleObj,
    headers: {
      Origin: embedPlayerOrigins.rubyStreamOrigin,
      Referer: embedPlayerOrigins.rubyStreamOrigin + "/",
    },
  };
}