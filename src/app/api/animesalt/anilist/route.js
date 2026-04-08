import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const axiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://animesalt.ac/',
    'Origin': 'https://animesalt.ac',
  },
});

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[`~!@#$%^&*()_\-+=[\]{};:'",<>/?\\|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  try {
    const aniXUrl = `https://api.anixtv.in/?id=${id}`;
    const aniXResponse = await axiosInstance.get(aniXUrl);
    const aniXData = aniXResponse.data;

    if (!aniXData.found) {
      return NextResponse.json({ error: 'Anime not found' }, { status: 404 });
    }

    const { season, title, is_movie, tmdb_mapped_title } = aniXData;

    const slugTitle = tmdb_mapped_title || title;
    const baseSlug = slugify(slugTitle);

    let contentUrl;
    let episodeList = [];

    if (is_movie) {
      contentUrl = `https://animesalt.ac/movies/${baseSlug}/`;
    } else {
      contentUrl = `https://animesalt.ac/episode/${baseSlug}-${season}x1/`;
    }

    let response;
    let html;
    let isNotFound = false;

    try {
      response = await axiosInstance.get(contentUrl, {
        responseType: 'text',
      });
      html = response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        isNotFound = true;
        html = '';
      } else {
        throw error;
      }
    }

    const $ = cheerio.load(html || '');
    const episodeListElement = $('#episode_by_temp');

    if (episodeListElement.length) {
      const episodes = episodeListElement.find('article.post.episodes');

      episodes.each((index, element) => {
        const $article = $(element);

        const episodeNumberText = $article.find('.num-epi').text().trim();
        const episodeNumber = parseInt(episodeNumberText);

        const episodeUrl = $article.find('a.lnk-blk').attr('href');

        // Extract image URL from the episode article - look for data-src or src with proper image URL
        let episodeImg = null;
        const $img = $article.find('div.imgp img, img');
        const dataSrc = $img.attr('data-src');
        const src = $img.attr('src');

        // Prefer data-src if it's a real image URL (not a placeholder)
        if (dataSrc && !dataSrc.startsWith('data:image')) {
          episodeImg = dataSrc;
        } else if (src && !src.startsWith('data:image')) {
          episodeImg = src;
        }

        let episodeId = null;

        if (episodeUrl) {
          const match = episodeUrl.match(/episode\/(.+?)(?:\/|$)/);
          if (match) {
            episodeId = match[1];
          }
        }

        if (episodeNumber && episodeId) {
          episodeList.push({
            episodeId: episodeId,
            number: episodeNumber,
            image: episodeImg
          });
        }
      });
    }

    episodeList.sort((a, b) => a.number - b.number);

    // For movies, if page exists (not 404) and no episode list found, use the baseSlug as the episodeId
    if (is_movie && !isNotFound && episodeList.length === 0) {
      episodeList.push({
        episodeId: baseSlug,
        number: 1,
        image: null
      });
    }

    return NextResponse.json({
      success: true,
      episodes: episodeList
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch episode list',
      details: error.message
    }, { status: 500 });
  }
}
