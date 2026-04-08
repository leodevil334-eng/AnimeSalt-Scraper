import * as cheerio from "cheerio";
import { AnimeCard, Cast, Genre, Tag } from "../../lib/types";
import { getDirectSources, getPlayerIframeUrls } from "../source";
import { NextRequest, NextResponse } from "next/server";


const TOONSTREAM_BASE = "https://toonstream.dad";

const BASE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") || 1);
    const slug = searchParams.get("slug");
    const type = searchParams.get("type");

    try {
        if (type === "info" && slug) {
            const data = await ScrapeMovieInfo(slug);
            return NextResponse.json({ success: true, data, took_ms: Date.now() });
        } else if (type === "sources" && slug) {
            const data = await ScrapeMovieSources(slug);
            return NextResponse.json({ success: true, data, took_ms: Date.now() });
        } else {
            const data = await ScrapeMovies(page);
            return NextResponse.json({ success: true, data, took_ms: Date.now() });
        }
    } catch (err) {
        console.log("ERROR", err);
        return NextResponse.json({ success: false, msg: "Internal Server Error" }, { status: 500 });
    }
}

async function ScrapeMovies(page: number = 1) {
    const url = TOONSTREAM_BASE + "/movies/" + (page == 1 ? "" : `page/${page}/`)
    try {
        const res = await fetch(url, { headers: BASE_HEADERS });
        if (!res.ok) throw new Error("Failed to fetch " + url);

        const html = await res.text();
        const $ = cheerio.load(html);

        const data: AnimeCard[] = [];

        const sect = $("main section.movies").first();
        $(sect).find(".aa-cn ul li").each((_, item) => {
            const title = $(item).find("article header h2.entry-title").text()
            const url = $(item).find("article a").attr("href") || "";
            const poster = $(item).find("article .post-thumbnail img").attr("src") || "";

            if (!url || !poster) return;

            const type = url.startsWith(TOONSTREAM_BASE + "/movie") ? "movie" : "series";
            const tmdbRating = Number($(item).find("article header .vote").text().replace("TMDB", "").trim());
            const slug = url.split("/").reverse()[1];


            data.push({ type, title, slug, poster, url, tmdbRating })
        });

        // pagination 
        const start = 1;
        const current = page;
        const end = Number($("nav.pagination a.page-link").last().text() || 1);

        const pagination = { current, start, end }
        return { pagination, data };

    } catch (err) {
        console.log("ERROR", err);
    }
}


export async function ScrapeMovieInfo(url: string) {
    const decodedURL = `${TOONSTREAM_BASE}/movie/${url}/`;
    console.log("Fetching", decodedURL)

    try {
        const res = await fetch(decodedURL, { headers: BASE_HEADERS });
        if (!res.ok) throw new Error("Failed to fetch " + decodedURL);

        const html = await res.text();
        const $ = cheerio.load(html);

        // basic info
        const article = $("#aa-wp article.single")

        const title = $(article).find("header .entry-title").text();

        // if title not found return no data
        if (!title) throw new Error("title not found for " + decodedURL);

        const year = $(article).find("header .entry-meta .year").text();

        const $paragraphs = $(article).find(".description p");
        const description = $paragraphs.eq(0).text();
        const languages = $paragraphs.eq(1).text().replace("Language:", "").trim().split("–").filter(Boolean).map(e => e.trim());
        const qualities = $paragraphs.eq(2).text().replace("Quality:", "").trim().split("|").filter(Boolean).map(e => e.trim());
        const runtime = $paragraphs.eq(3).text().replace("Running time:", "").trim();

        const tmdbRating = Number($(article).find("footer .vote-cn span.num").text());

        const genres: Genre[] = [];
        const tags: Tag[] = [];
        const casts: Cast[] = [];

        $(article).find("header span.genres a").each((_, elem) => {
            const name = $(elem).text();
            const url = $(elem).attr("href");

            const urlSplits = url?.split("/").reverse() || [];
            const slug = urlSplits[0] || urlSplits[1];

            if (!url || !slug) return;
            genres.push({ name, slug, url })
        })

        $(article).find("header span.tag a").each((_, elem) => {
            const name = $(elem).text();
            const url = $(elem).attr("href");

            if (!url) return;
            tags.push({ name, url })
        })

        $(article).find(".cast-lst a").each((_, elem) => {
            const name = $(elem).text();
            const url = $(elem).attr("href");

            if (!url) return;
            casts.push({ name, url })
        })

        return {
            title, year, tmdbRating,
            description, languages, qualities, runtime,
            genres, tags, casts,
        }
    } catch (err) {
        console.log("ERROR", err);
    }
} 

export async function ScrapeMovieSources(slug: string) {
    const url = `${TOONSTREAM_BASE}/movie/${slug}/`;

    try {
        const res = await fetch(url, { headers: BASE_HEADERS });
        if (!res.ok) throw new Error("Failed to fetch " + url);

        const html = await res.text();
        const $ = cheerio.load(html);

        const toonStreamIframeUrls = $("aside#aa-options iframe").map((_, el) => $(el).attr("data-src")).get();

        const playerIframeUrls = await getPlayerIframeUrls(toonStreamIframeUrls);

        const directSources = await getDirectSources(playerIframeUrls);

        return {
            embeds: playerIframeUrls,
            sources: directSources
        };

    } catch (err) {
        console.log("ERROR", err);
    }
}