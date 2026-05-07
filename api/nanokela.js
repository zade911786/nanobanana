export default async function handler(req, res) {
  const image = req.query.image ?? '';
  const prompt = req.query.prompt ?? '';

  const credit = "@zade4everbot on telegram";

  if (!image || !prompt) {
    return res.status(400).json({
      success: false,
      error: "image and prompt parameters required",
      credit
    });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0] ?? req.socket?.remoteAddress ?? 'unknown';
  const ua = req.headers['user-agent'] ?? 'bizft';

  const deviceId = await md5Hash(ip + ua);

  const payload = {
    images: [image],
    prompt,
    aspect_ratio: "1:1",
    device_id: deviceId
  };

  let response;
  try {
    response = await fetch("https://api-preview.apirouter.ai/api/v1/deepimg/image-nano-banana-free", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Origin": "https://deepimg.io",
        "Referer": "https://deepimg.io/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) Chrome/143.0.0.0 Mobile Safari/537.36",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000)
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      credit
    });
  }

  let json;
  try {
    json = await response.json();
  } catch {
    return res.status(500).json({
      success: false,
      error: "Failed to parse upstream response",
      credit
    });
  }

  const images = [];
  if (Array.isArray(json?.data?.images)) {
    for (const img of json.data.images) {
      if (img?.url) images.push(img.url);
    }
  }

  if (!images.length) {
    return res.status(502).json({
      success: false,
      error: "No images returned",
      raw: json,
      credit
    });
  }

  return res.status(200).json({
    success: true,
    images,
    credit: "@zade4everbot"
  });
}

// Web Crypto based md5-like hash (Vercel Edge doesn't have crypto.createHash)
// Using SHA-1 truncated as device_id substitute since MD5 isn't in Web Crypto
async function md5Hash(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-1", enc);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32); // 32 chars like md5
}
