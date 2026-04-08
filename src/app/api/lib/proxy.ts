
import { DirectSource } from "./types";

export function proxifySource(source: DirectSource): DirectSource {
    const { type, url, headers } = source;
    const headerQuery = headers ? "&headers=" +encodeURIComponent(JSON.stringify(headers)) : "";

    const encodedUrl = encodeURIComponent(url);

    const finalUrl = type == "hls" ? `/m3u8-proxy?url=${encodedUrl}${headerQuery}` :
        `/mp4-proxy?url=${encodedUrl}${headerQuery}`

    return {
        proxiedUrl: finalUrl,
        ...source,
    };
} 