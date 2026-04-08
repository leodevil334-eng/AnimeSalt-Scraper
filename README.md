# AnimeSalt API Routes Documentation

This directory contains all API routes for the AnimeSalt scraper. The API scrapes data from `https://toonstream.dad` and `https://animesalt.ac` to provide anime/movies information and streaming sources.

## Base URL

All API routes are prefixed with `/api/animesalt/`

## API Routes Overview

| Route | Method | Description |
|-------|--------|-------------|
| `/home` | GET | Get homepage content (featured anime, latest episodes, sidebar sections) |
| `/search` | GET | Search for anime/movies by query |
| `/series` | GET | Get series list or series details/sources |
| `/movie` | GET | Get movies list or movie details/sources |
| `/episode` | GET | Get episode streaming sources |
| `/episode/info` | GET | Get episode/series detailed information |
| `/anilist` | GET | Get episodes list by AniList ID |

---

## Detailed API Documentation

### 1. Home - `/api/animesalt/home`

Fetches the homepage content including main sections, sidebar sections, and latest episodes.

**Method:** `GET`

**Query Parameters:** None

**Response:**
```json
{
  "main": [
    {
      "label": "Section Title",
      "viewMore": "https://toonstream.dad/category/",
      "data": [
        {
          "type": "series",
          "title": "Anime Title",
          "slug": "anime-title",
          "poster": "https://image.url/poster.jpg",
          "url": "https://toonstream.dad/series/anime-title/",
          "tmdbRating": 8.5
        }
      ]
    }
  ],
  "sidebar": [
    {
      "label": "Sidebar Section",
      "data": [
        {
          "type": "movie",
          "title": "Movie Title",
          "slug": "movie-title",
          "poster": "https://image.url/poster.jpg",
          "url": "https://toonstream.dad/movie/movie-title/",
          "tmdbRating": 7.2
        }
      ]
    }
  ],
  "lastEpisodes": [
    {
      "title": "Episode Title",
      "slug": "anime-title",
      "url": "https://toonstream.dad/episode/anime-title-1x1/",
      "epXseason": "1x1",
      "ago": "2 hours ago",
      "thumbnail": "https://image.url/thumbnail.jpg"
    }
  ]
}
```

---

### 2. Search - `/api/animesalt/search`

Search for anime or movies by query string.

**Method:** `GET`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query |
| `page` | number | No | Page number (default: 1) |

**Example:**
```
GET /api/animesalt/search?q=naruto&page=1
```

**Response:**
```json
{
  "query": "naruto",
  "pagination": {
    "current": 1,
    "start": 1,
    "end": 5
  },
  "data": [
    {
      "type": "series",
      "title": "Naruto",
      "slug": "naruto",
      "poster": "https://image.url/poster.jpg",
      "url": "https://toonstream.dad/series/naruto/",
      "tmdbRating": 8.9
    }
  ]
}
```

---

### 3. Series - `/api/animesalt/series`

Get series list, series info, or episode sources.

**Method:** `GET`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No* | Page number (for list view) |
| `slug` | string | No* | Series slug (for info/sources) |
| `type` | string | No* | `"info"` or `"sources"` |

*Depending on the type of request

#### 3.1 Get Series List

```
GET /api/animesalt/series?page=1
```

**Response:**
```json
{
  "pagination": {
    "current": 1,
    "start": 1,
    "end": 10
  },
  "data": [
    {
      "type": "series",
      "title": "Series Title",
      "slug": "series-title",
      "poster": "https://image.url/poster.jpg",
      "url": "https://toonstream.dad/series/series-title/",
      "tmdbRating": 8.0
    }
  ]
}
```

#### 3.2 Get Series Info

```
GET /api/animesalt/series?type=info&slug=series-title
```

**Response:**
```json
{
  "success": true,
  "took_ms": 1234,
  "data": {
    "title": "Series Title",
    "year": "2023",
    "tmdbRating": 8.5,
    "totalSeasons": 2,
    "totalEpisodes": 24,
    "description": "Series description...",
    "languages": ["Japanese", "English"],
    "qualities": ["1080p", "720p"],
    "runtime": "24 min",
    "genres": [
      { "name": "Action", "slug": "action", "url": "https://toonstream.dad/genre/action/" }
    ],
    "tags": [
      { "name": "Shonen", "url": "https://toonstream.dad/tag/shonen/" }
    ],
    "casts": [
      { "name": "Actor Name", "url": "https://toonstream.dad/actor/actor-name/" }
    ],
    "seasons": [
      {
        "label": "Season 1",
        "season_no": 1,
        "episodes": [
          {
            "episode_no": 1,
            "slug": "series-title-1x1",
            "title": "Episode 1 Title",
            "url": "https://toonstream.dad/episode/series-title-1x1/",
            "epXseason": "1x1",
            "thumbnail": "https://image.url/ep1.jpg"
          }
        ]
      }
    ]
  }
}
```

#### 3.3 Get Episode Sources

```
GET /api/animesalt/series?type=sources&slug=episode-slug
```

**Response:**
```json
{
  "success": true,
  "took_ms": 2345,
  "data": {
    "embeds": [
      "https://embed.server1.com/video/abc123",
      "https://embed.server2.com/video/def456"
    ],
    "sources": [
      {
        "server": "server1",
        "url": "https://stream.server1.com/video.m3u8",
        "quality": "1080p"
      }
    ]
  }
}
```

---

### 4. Movie - `/api/animesalt/movie`

Get movies list, movie info, or movie sources.

**Method:** `GET`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No* | Page number (for list view) |
| `slug` | string | No* | Movie slug (for info/sources) |
| `type` | string | No* | `"info"` or `"sources"` |

#### 4.1 Get Movies List

```
GET /api/animesalt/movie?page=1
```

**Response:**
```json
{
  "pagination": {
    "current": 1,
    "start": 1,
    "end": 8
  },
  "data": [
    {
      "type": "movie",
      "title": "Movie Title",
      "slug": "movie-title",
      "poster": "https://image.url/poster.jpg",
      "url": "https://toonstream.dad/movie/movie-title/",
      "tmdbRating": 7.8
    }
  ]
}
```

#### 4.2 Get Movie Info

```
GET /api/animesalt/movie?type=info&slug=movie-title
```

**Response:**
```json
{
  "success": true,
  "took_ms": 1500,
  "data": {
    "title": "Movie Title",
    "year": "2023",
    "tmdbRating": 8.2,
    "description": "Movie description...",
    "languages": ["Japanese"],
    "qualities": ["1080p", "720p"],
    "runtime": "120 min",
    "genres": [
      { "name": "Action", "slug": "action", "url": "https://toonstream.dad/genre/action/" }
    ],
    "tags": [
      { "name": "Movie", "url": "https://toonstream.dad/tag/movie/" }
    ],
    "casts": [
      { "name": "Actor Name", "url": "https://toonstream.dad/actor/actor-name/" }
    ]
  }
}
```

#### 4.3 Get Movie Sources

```
GET /api/animesalt/movie?type=sources&slug=movie-title
```

**Response:**
```json
{
  "success": true,
  "took_ms": 2000,
  "data": {
    "embeds": [
      "https://embed.server1.com/video/abc123"
    ],
    "sources": [
      {
        "server": "server1",
        "url": "https://stream.server1.com/movie.m3u8",
        "quality": "1080p"
      }
    ]
  }
}
```

---

### 5. Episode - `/api/animesalt/episode`

Get streaming sources for a specific episode.

**Method:** `GET`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `episodeId` | string | Yes | Episode ID/slug |

**Example:**
```
GET /api/animesalt/episode?episodeId=anime-title-1x1
```

**Response:**
```json
{
  "source": "animesalt",
  "iframe": "https://embed.server.com/video/abc123?data=xyz",
  "m3u8": "https://stream.server.com/video.m3u8",
  "proxy": "/api/proxy?url=https%3A%2F%2Fstream.server.com%2Fvideo.m3u8&referer=https%3A%2F%2Fembed.server.com"
}
```

---

### 6. Episode Info - `/api/animesalt/episode/info`

Get detailed information about a series including seasons and episodes.

**Method:** `GET`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | Series slug |

**Example:**
```
GET /api/animesalt/episode/info?slug=series-title
```

**Response:**
```json
{
  "success": true,
  "took_ms": 1800,
  "data": {
    "info": {
      "title": "Series Title",
      "description": "Series description...",
      "poster": "https://image.url/poster.jpg",
      "background": "https://image.url/background.jpg",
      "year": "2023",
      "duration": "24 min",
      "seasons": 2,
      "episodes": 24,
      "rating": 8.5,
      "genres": ["Action", "Adventure"],
      "tags": ["Shonen", "Fantasy"],
      "cast": ["Actor 1", "Actor 2"]
    },
    "seasons": [
      { "season": 1, "postId": "12345" },
      { "season": 2, "postId": "12346" }
    ],
    "episodes": [
      {
        "season": 1,
        "episode": 1,
        "title": "Episode 1 Title",
        "thumbnail": "https://image.url/ep1.jpg",
        "url": "https://toonstream.dad/episode/series-title-1x1/",
        "aired": "2 hours ago"
      }
    ]
  }
}
```

---

### 7. AniList - `/api/animesalt/anilist`

Get episodes list by AniList ID. This endpoint queries the AniX API to map AniList IDs to AnimeSalt content.

**Method:** `GET`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | AniList ID |

**Example:**
```
GET /api/animesalt/anilist?id=20
```

**Response:**
```json
{
  "success": true,
  "episodes": [
    {
      "episodeId": "one-piece-1",
      "number": 1,
      "image": "https://image.url/ep1.jpg"
    },
    {
      "episodeId": "one-piece-2",
      "number": 2,
      "image": "https://image.url/ep2.jpg"
    }
  ]
}
```

---

## Error Responses

All endpoints return appropriate HTTP status codes and error messages:

| Status Code | Description |
|-------------|-------------|
| `200` | Success |
| `400` | Bad Request (missing required parameters) |
| `404` | Not Found (content not available) |
| `500` | Internal Server Error |

**Error Response Format:**
```json
{
  "error": "Error message description",
  "details": "Additional error details"
}
```

---

## Rate Limiting

Currently, there is no rate limiting implemented on these API routes. Please use responsibly to avoid overwhelming the source servers.

---

## Notes

- All scraping is done server-side using Cheerio for HTML parsing
- The API uses custom headers and session management to mimic browser behavior
- Some endpoints use cookie jars for maintaining session state
- Streaming sources are extracted from embedded players (AS-CDN and RubyStream)
- The `proxy` field in episode responses provides a proxy URL for CORS-enabled streaming
