import axios from "axios";
import * as cheerio from "cheerio";

function createSession() {
  const instance = axios.create({
    timeout: 15000,
    withCredentials: true,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/146 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  let cookieJar = "";

  instance.interceptors.response.use((res) => {
    const setCookie = res.headers["set-cookie"];
    if (setCookie) {
      cookieJar = setCookie.map((c) => c.split(";")[0]).join("; ");
    }
    return res;
  });

  instance.interceptors.request.use((config) => {
    if (cookieJar) config.headers["Cookie"] = cookieJar;
    return config;
  });

  return instance;
}

function extractIframe(html) {
  const $ = cheerio.load(html);
  return (
    $("iframe[data-src]").attr("data-src") ||
    $("iframe[src]").attr("src") ||
    null
  );
}

function extractDataHash(url) {
  try {
    const u = new URL(url);

    if (u.searchParams.get("data")) return u.searchParams.get("data");

    const parts = u.pathname.split("/");
    const i = parts.indexOf("video");
    if (i !== -1) return parts[i + 1];

    return null;
  } catch {
    return null;
  }
}

export async function extractAnimesalt(episodeId) {
  const session = createSession();

  // Try episode page first, fallback to movies page
  const episodeUrl = `https://animesalt.ac/episode/${episodeId}/`;
  const fallbackUrl = `https://animesalt.ac/movies/${episodeId}/`;

  // 1️⃣ Episode page (with fallback to movies page)
  let epRes;
  let usedFallback = false;
  try {
    epRes = await session.get(episodeUrl, {
      headers: { Referer: "https://animesalt.ac/" },
    });
  } catch (error) {
    console.log(`Episode page failed, trying fallback movies page: ${error.message}`);
    epRes = await session.get(fallbackUrl, {
      headers: { Referer: "https://animesalt.ac/" },
    });
    usedFallback = true;
  }

  const iframe = extractIframe(epRes.data);
  if (!iframe) throw new Error("No iframe");

  const cleanIframe = iframe.replace(/&#038;/g, "&");

  // 2️⃣ Visit iframe (sets cookies)
  await session.get(cleanIframe, {
    headers: { Referer: "https://animesalt.ac/" },
  });

  // 3️⃣ Extract token
  const hash = extractDataHash(cleanIframe);
  if (!hash) throw new Error("No hash");

  const embedOrigin = new URL(cleanIframe).origin;

  // 4️⃣ API call
  const apiRes = await session.post(
    `${embedOrigin}/player/index.php?data=${hash}&do=getVideo`,
    {},
    {
      headers: {
        Referer: "https://animesalt.ac/",
        Origin: "https://animesalt.ac",
        "X-Requested-With": "XMLHttpRequest",
      },
    }
  );

  const { securedLink, videoSource } = apiRes.data;
  const m3u8 = securedLink || videoSource;

  if (!m3u8) throw new Error("No stream");

  return {
    source: "animesalt",
    iframe: cleanIframe,
    m3u8,

    // 🔥 proxy fallback with cookies
    proxy: `/api/proxy?url=${encodeURIComponent(
      m3u8
    )}&referer=${encodeURIComponent(cleanIframe)}&cookie=${encodeURIComponent(cookieJar)}`,
  };
}

// API route handler
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episodeId');

    if (!episodeId) {
      return new Response(
        JSON.stringify({ error: 'episodeId parameter is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await extractAnimesalt(episodeId);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Animesalt episode extraction error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to extract episode',
        details: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
