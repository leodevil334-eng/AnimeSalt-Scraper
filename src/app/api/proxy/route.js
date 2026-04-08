import axios from "axios";

const axiosInstance = axios.create({
  timeout: 15000,
  decompress: true,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/146 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "identity",
  },
});

const ALLOWED_HOST_PATTERN = /^as-cdn\d+\.top$/;

function isAllowedHost(hostname) {
  return ALLOWED_HOST_PATTERN.test(hostname);
}

function isM3u8(contentType, body) {
  return (
    contentType.includes("mpegurl") ||
    body.trimStart().startsWith("#EXTM3U")
  );
}

function toAbsolute(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function rewriteM3u8(content, baseUrl, referer, cookie) {
  const base = new URL(baseUrl);
  const ref = referer ? `&referer=${encodeURIComponent(referer)}` : "";
  const cook = cookie ? `&cookie=${encodeURIComponent(cookie)}` : "";

  return content
    .split("\n")
    .map((line) => {
      const t = line.trim();

      if (!t) return line;

      if (t.includes('URI="')) {
        return line.replace(/URI="([^"]+)"/, (_, uri) => {
          const abs = toAbsolute(uri, base);
          return `URI="/api/proxy?url=${encodeURIComponent(abs)}${ref}${cook}"`;
        });
      }

      if (!t.startsWith("#")) {
        const abs = toAbsolute(t, base);
        return `/api/proxy?url=${encodeURIComponent(abs)}${ref}${cook}`;
      }

      return line;
    })
    .join("\n");
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const target = searchParams.get("url");
  const referer = searchParams.get("referer");
  const cookie = searchParams.get("cookie");

  if (!target) return new Response("Missing url", { status: 400 });

  const parsed = new URL(target);

  if (!isAllowedHost(parsed.hostname)) {
    return new Response("Forbidden", { status: 403 });
  }

  const headers = {
    Referer: referer,
    Origin: referer ? new URL(referer).origin : undefined,
    Range: req.headers.get("range") || "bytes=0-",
  };

  // Pass cookie from client or from cookie parameter
  const cookieValue = cookie || req.headers.get("cookie");
  if (cookieValue) {
    headers["Cookie"] = cookieValue;
  }

  const res = await axiosInstance.get(target, {
    responseType: "arraybuffer",
    headers,
    validateStatus: () => true,
  });

  // Prepare response headers
  const responseHeaders = {
    "Content-Type": res.headers["content-type"] || "application/octet-stream",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Set-Cookie",
  };

  // Forward Set-Cookie headers from target server to client
  const setCookie = res.headers["set-cookie"];
  if (setCookie) {
    responseHeaders["Set-Cookie"] = setCookie;
  }

  const type = res.headers["content-type"] || "";
  const buf = res.data;
  const text = buf.toString("utf-8");

  if (isM3u8(type, text)) {
    return new Response(rewriteM3u8(text, target, referer, cookieValue), {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Set-Cookie",
        ...(setCookie ? { "Set-Cookie": setCookie } : {}),
      },
    });
  }

  return new Response(buf, {
    headers: responseHeaders,
  });
}
