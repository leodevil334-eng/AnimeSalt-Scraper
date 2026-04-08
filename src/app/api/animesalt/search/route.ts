import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const TOONSTREAM_BASE = "https://toonstream.dad";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const query = searchParams.get("q");
    const page = Number(searchParams.get("page") || "1");

    if (!query) {
      return NextResponse.json(
        { error: "Missing query (q)" },
        { status: 400 }
      );
    }

    const url = `${TOONSTREAM_BASE}/${query ? `search/${query}/` : ''}?s=${encodeURIComponent(query)}`  ;

    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "accept-language": "en-US,en;q=0.9",
        referer: TOONSTREAM_BASE,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const data: any[] = [];

    const sect = $("main section.movies").first();

    sect.find(".aa-cn ul li").each((_, item) => {
      const el = $(item);

      const link = el.find("article a").attr("href") || "";
      const poster =
        el.find("article .post-thumbnail img").attr("src") || "";

      if (!link || !poster) return;

      const type = link.includes("/series") ? "series" : "movie";

      const title = el
        .find("article header h2.entry-title")
        .text()
        .trim();

      const ratingText = el
        .find("article header .vote")
        .text()
        .replace("TMDB", "")
        .trim();

      const tmdbRating = Number(ratingText) || 0;

      const slug = link.split("/").filter(Boolean).pop();

      data.push({
        type,
        title,
        slug,
        poster,
        url: link,
        tmdbRating,
      });
    });

    // pagination
    const current = page;
    const end =
      Number($("nav.pagination a.page-link").last().text()) || 1;

    return NextResponse.json({
      query,
      pagination: {
        current,
        start: 1,
        end,
      },
      data,
    });
  } catch (err: any) {
    console.error("ERROR:", err?.message);

    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}