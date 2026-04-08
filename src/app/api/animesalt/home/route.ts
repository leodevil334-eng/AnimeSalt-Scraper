import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { AnimeCard, LastEpisode, MainSection, SidebarSection } from "../../lib/types";

const TOONSTREAM_BASE = "https://toonstream.dad";

export async function GET() {
    /**
     * SERVE CACHE: TODO 
    **/

    try {
        const url = TOONSTREAM_BASE + "/home/"
        const res = await fetch(url);

        if (!res.ok) throw new Error("Failed to fetch " + url);

        const html = await res.text();
        const $ = cheerio.load(html);


        /*  SIDEBAR */
        const sidebarSections: SidebarSection[] = [];
        $("aside.sidebar section").each((_: number, section: any) => {

            const sectionTitle = $(section).find("h3.section-title").text();
            if (!sectionTitle) return; // skip invalid ones

            const data: AnimeCard[] = [];

            $(section).find("ul li").each((_: number, item: any) => {
                const title = $(item).find("article header h2.entry-title").text()
                const url = $(item).find("article a").attr("href");
                const poster = $(item).find("article .post-thumbnail img").attr("src");

                if (!url || !poster) return;

                const type = url.startsWith(TOONSTREAM_BASE + "/series") ? "series" : "movie";
                const tmdbRating = Number($(item).find("article header .vote").text().replace("TMDB", "").trim());
                const slug = url.split("/").reverse()[1];

                data.push({ type, title, slug, poster, url, tmdbRating })
            });


            sidebarSections.push({ label: sectionTitle, data });

        });
        /* END SIDEBAR */

        /**  MAIN SECTIONS **/

        // LAST EPISODES 
        const lastEpisodes: LastEpisode[] = [];

        $("main .widget_list_episodes ul li").each((_: number, ep: any) => {
            const url = $(ep).find("a").attr("href");
            const thumbnail = $(ep).find("img").attr("src");

            if (!url || !thumbnail) return;

            const slug = url.split("/").reverse()[1];


            const title = $(ep).find("header h2.entry-title").text();
            const epXseason = $(ep).find("header .num-epi").text();
            const ago = $(ep).find("header .time").text();


            lastEpisodes.push({ title, slug, url, epXseason, ago, thumbnail })
        })
        // END  LAST EPISODES

        // MAIN SECTIONS
        const mainSections: MainSection[] = []

        $("main section.movies").each((_: number, sect: any) => {
            const sectionTitle = $(sect).find("header .section-title").text();
            const viewMoreUrl = $(sect).find("header a").attr("href");

            const data: AnimeCard[] = []

            $(sect).find(".aa-cn ul li").each((_: number, item: any) => {
                const title = $(item).find("article header h2.entry-title").text()
                const url = $(item).find("article a").attr("href") || "";
                const poster = $(item).find("article .post-thumbnail img").attr("src") || "";

                if (!url || !poster) return;

                const type = url.startsWith(TOONSTREAM_BASE + "/series") ? "series" : "movie";
                const tmdbRating = Number($(item).find("article header .vote").text().replace("TMDB", "").trim());
                const slug = url.split("/").reverse()[1];

                data.push({ type, title, slug, poster, url, tmdbRating })
            });

            mainSections.push({ label: sectionTitle, viewMore: viewMoreUrl, data });
        })
        // END MAIN SECTIONS


        // SCHEDULE 
        //TODO scrape schedules
        // END SCHEDULE 


        /**  END MAIN SECTIONS **/


        return NextResponse.json({
            main: mainSections,
            sidebar: sidebarSections,
            lastEpisodes
        })
    } catch (err) {
        console.log("Error", err)
    }
}

// Bun.write(`logs/${Date.now()}`, JSON.stringify(await ScrapeHome()))