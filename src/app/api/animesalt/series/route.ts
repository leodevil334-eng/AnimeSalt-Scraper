import * as cheerio from "cheerio";
import { AnimeCard, Cast, Episode, Genre, Season, Tag } from "../../lib/types";
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
            const data = await ScrapeSeriesInfo(slug);
            return NextResponse.json({ success: true, data, took_ms: Date.now() });
        } else if (type === "sources" && slug) {
            const data = await ScrapeEpisodeSources(slug);
            return NextResponse.json({ success: true, data, took_ms: Date.now() });
        } else {
            const data = await ScrapeSeries(page);
            return NextResponse.json({ success: true, data, took_ms: Date.now() });
        }
    } catch (err) {
        console.log("ERROR", err);
        return NextResponse.json({ success: false, msg: "Internal Server Error" }, { status: 500 });
    }
}

async function ScrapeSeries(page: number = 1) {
    const url = TOONSTREAM_BASE + "/series/" + (page == 1 ? "" : `page/${page}/`)
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

            const type = url.startsWith(TOONSTREAM_BASE + "/series") ? "series" : "movie";
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


export async function ScrapeSeriesInfo(url: string) {
    const decodedURL = `${TOONSTREAM_BASE}/series/${url}/`;
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
        const totalSeasons = Number($(article).find("header .entry-meta .seasons").text().replace("Seasons", "").trim());
        const totalEpisodes = Number($(article).find("header .entry-meta .episodes").text().replace("Episodes", "").trim());

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


        // seasons
        const bodyClass = $("body").attr("class");
        const match = bodyClass?.match(/postid-(\d+)/) || [];
        const postId = match[1];

        if (!postId) throw new Error("postid not found for " + url);

        const seasons: Season[] = await getSeasonsByPostId(postId, 1, totalSeasons);

        return {
            title, year, tmdbRating,
            totalSeasons, totalEpisodes,
            description, languages, qualities, runtime,
            genres, tags, casts,
            seasons
        }
    } catch (err) {
        console.log("ERROR", err);
    }
} 

async function getSeasonsByPostId(postId: string, start_season: number, end_season: number) {
    const seasons: Season[] = [];

    for (let i = start_season; i <= end_season; i++) {
        const episodes: Episode[] = [];

        const res = await fetch(TOONSTREAM_BASE + "/home/wp-admin/admin-ajax.php", {
            "headers": {
                "accept": "*/*",
                "accept-language": "en-US,en;q=0.9,hi;q=0.8,bn;q=0.7",
                "cache-control": "no-cache",
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "pragma": "no-cache",
                "priority": "u=1, i",
                "sec-ch-ua": "\"Google Chrome\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest",
            },
            "body": `action=action_select_season&season=${i}&post=${postId}`,
            "method": "POST"
        });

        if (!res.ok) {
            console.log("Error: failed to fetch season " + i + " episodes for postid-" + postId);
            continue;
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        $("li").each((j, ep) => {
            const url = $(ep).find("a").attr("href");
            const thumbnail = $(ep).find("img").attr("src");
            
            if (!url || !thumbnail) return;
            
            const slug = url.split("/").reverse()[1];
            
            const title = $(ep).find("header h2.entry-title").text();
            const epXseason = $(ep).find("header .num-epi").text();

            episodes.push({ episode_no: j + 1, slug, title, url, epXseason, thumbnail })
        })

        seasons.push({
            label: `Season ${i}`,
            season_no: i,
            episodes
        })
    }

    return seasons;

}

export async function ScrapInfo(params: { slug: string }) {
    const url = TOONSTREAM_BASE + "/series/" + params.slug + "/";

    try {
        const res = await fetch(url, { headers: BASE_HEADERS });
        if (!res.ok) throw new Error("Failed to fetch " + url);

        const html = await res.text();
        const $ = cheerio.load(html);

        // 🔹 Series Info
        const seriesInfo = {
            title: $("h1.entry-title").text().trim(),
            description: $(".description p").text().trim(),
            poster: $(".post-thumbnail figure img").attr("src"),
            background: $(".bghd img.TPostBg").attr("src"),
            year: $(".year").text().trim(),
            duration: $(".duration").text().trim(),
            seasons: parseInt($(".seasons span").text().trim()) || 0,
            episodes: parseInt($(".episodes span").text().trim()) || 0,
            rating: parseFloat($(".vote .num").text().trim()) || 0,
            genres: $(".genres a").map((_, el) => $(el).text().trim()).get(),
            tags: $(".tag a").map((_, el) => $(el).text().trim()).get(),
            cast: $(".cast-lst .loadactor a").map((_, el) => $(el).text().trim()).get()
        };

        // 🔹 Seasons List
        const seasonsList: { season: number; postId: string }[] = [];
        $(".aa-drp.choose-season .aa-cnt li a").each((_, el) => {
            const seasonText = $(el).text().trim();
            const seasonNum = parseInt(seasonText.replace("Season ", ""));
            const postId = $(el).attr("data-post");

            if (!isNaN(seasonNum) && postId) {
                seasonsList.push({ season: seasonNum, postId });
            }
        });

        // 🔹 Episodes List
        const episodesList: {
            season: number;
            episode: number;
            title: string;
            thumbnail: string;
            url: string;
            episodeId: string;
            aired: string;
        }[] = [];

        $("#episode_by_temp li").each((_, el) => {
            const article = $(el).find("article.post");

            const episodeNumText = article.find(".num-epi").text().trim();
            const match = episodeNumText.match(/(\d+)x(\d+)/);

            if (match) {
                const season = parseInt(match[1]);
                const episode = parseInt(match[2]);

                const title = article.find(".entry-title").text().trim();
                const thumbnail =
                    article.find(".post-thumbnail figure img").attr("src") || "";
                const aired = article.find(".time").text().trim();

                const rawUrl = article.find("a.lnk-blk").attr("href") || "";

                let episodeId = "";
                try {
                    const pathname = new URL(rawUrl).pathname;
                    episodeId = pathname.split("/").filter(Boolean).pop() || "";
                } catch {
                    episodeId = "";
                }

                episodesList.push({
                    season,
                    episode,
                    title,
                    thumbnail,
                    url: episodeId,       // 👈 clean slug
                    episodeId: episodeId, // 👈 same (or keep rawUrl if you want)
                    aired
                });
            }
        });

        console.log(`Found ${episodesList.length} episodes`);

        return {
            info: seriesInfo,
            seasons: seasonsList,
            episodes: episodesList
        };
    } catch (error) {
        console.error("Error scraping info:", error);
        throw error;
    }
}
export async function ScrapeEpisodeSources(slug: string) {
    const url = `${TOONSTREAM_BASE}/episode/${slug}/`;

    try {
        const res = await fetch(url);
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