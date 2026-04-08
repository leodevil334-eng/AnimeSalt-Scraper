import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";

const TOONSTREAM_BASE = "https://toonstream.dad";

const BASE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get("slug");

    if (!slug) {
        return NextResponse.json({ success: false, msg: "slug parameter is required" }, { status: 400 });
    }

    try {
        const data = await ScrapInfo({ slug });
        return NextResponse.json({ success: true, data, took_ms: Date.now() });
    } catch (err) {
        console.log("ERROR", err);
        return NextResponse.json({ success: false, msg: "Internal Server Error" }, { status: 500 });
    }
}

export async function ScrapInfo(params: { slug: string }) {
    const url = TOONSTREAM_BASE + "/series/" + params.slug + "/";
    try {
        const res = await fetch(url, { headers: BASE_HEADERS });
        if (!res.ok) throw new Error("Failed to fetch " + url);

        const html = await res.text();
        const $ = cheerio.load(html);

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

        const seasonsList: { season: number; postId: string }[] = [];
        $(".aa-drp.choose-season .aa-cnt li a").each((_, el) => {
            const seasonText = $(el).text().trim();
            const seasonNum = parseInt(seasonText.replace("Season ", ""));
            const postId = $(el).attr("data-post");
            if (!isNaN(seasonNum) && postId) {
                seasonsList.push({
                    season: seasonNum,
                    postId: postId
                });
            }
        });

        const episodesList: {
            season: number;
            episode: number;
            title: string;
            thumbnail: string;
            url: string;
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
                const thumbnail = article.find(".post-thumbnail figure img").attr("src");
                const aired = article.find(".time").text().trim();
                const episodeUrl = article.find("a.lnk-blk").attr("href");
                
                episodesList.push({
                    season,
                    episode,
                    title,
                    thumbnail: thumbnail || "",
                    url: episodeUrl || "",
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


