import { DirectSource } from "./types";

const TOONSTREAM_BASE = "https://toonstream.dad";

const UserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";

const embedPlayerOrigins = {
  asCdnOrigin: "https://as-cdn21.top",
  rubyStreamOrigin: "https://rubystm.com",
  cloudyUpnOrigin: "https://cloudy.upns.one",
};

export async function getAsCdnSource(
  url: string,
  origin: string = embedPlayerOrigins.asCdnOrigin
): Promise<DirectSource | undefined> {
  try {
    // 1. Get cookie
    const res1 = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      headers: {
        "User-Agent": UserAgent,
      },
    });

    if (!res1.ok) {
      console.log("[ERROR] Failed to fetch for cookie:", url);
      console.log(`[ERROR] Status ${res1.status} - ${res1.statusText}`);
      return;
    }

    // ⚠️ Node 18+ compatibility fix
    const rawCookies =
      (res1.headers as any).getSetCookie?.() ||
      res1.headers.get("set-cookie")?.split(",") ||
      [];

    if (!rawCookies.length) {
      console.log("[ERROR] No cookies found:", url);
      return;
    }

    // Extract first cookie safely
    const cookieStr = rawCookies[0].split(";")[0];
    console.log("GOT COOKIE:", cookieStr);

    // 2. Get stream
    const hash = url.split("/").pop();
    if (!hash) {
      console.log("[ERROR] No hash found in URL:", url);
      return;
    }

    const url2 = `${embedPlayerOrigins.asCdnOrigin}/player/index.php?data=${hash}&do=getVideo`;

    const res2 = await fetch(url2, {
      method: "POST",
      cache: "no-store",
      body: new URLSearchParams({
        hash,
        r: "",
      }),
      headers: {
        Cookie: cookieStr,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: origin,
        Referer: origin + "/",
        "User-Agent": UserAgent,
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!res2.ok) {
      console.log("[ERROR] Failed to fetch stream:", url2);
      console.log(`[ERROR] Status ${res2.status} - ${res2.statusText}`);
      return;
    }

    const {
      hls,
      videoSource,
      securedLink,
      videoImage: thumbnail,
    } = await res2.json();

    const type = hls ? "hls" : "mp4";
    const streamUrl = securedLink || videoSource;

    if (!streamUrl) {
      console.log("[ERROR] No stream URL found:", url);
      return;
    }

    return {
      label: "Multi Audio",
      type,
      url: streamUrl,
      thumbnail,
      headers: {
        Cookie: cookieStr,
        "User-Agent": UserAgent,
      },
    };
  } catch (err) {
    console.log("[ERROR]", err);
  }
}