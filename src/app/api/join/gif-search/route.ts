import { NextRequest, NextResponse } from "next/server";

interface GiphyImage {
  url: string;
}
interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_height_small?: GiphyImage;
    fixed_height?: GiphyImage;
    downsized?: GiphyImage;
    original?: GiphyImage;
  };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GIPHY_API_KEY not set in .env.local" },
      { status: 503 }
    );
  }

  try {
    const url = new URL("https://api.giphy.com/v1/gifs/search");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "21");
    url.searchParams.set("rating", "g");
    url.searchParams.set("lang", "en");

    const res = await fetch(url.toString());
    if (!res.ok) {
      return NextResponse.json({ error: "GIPHY request failed" }, { status: 502 });
    }
    const data = await res.json();

    const results = (data.data as GiphyGif[]).map((gif) => ({
      id: gif.id,
      title: gif.title,
      // Smaller URL for the grid preview tiles
      preview:
        gif.images.fixed_height_small?.url ??
        gif.images.fixed_height?.url ??
        gif.images.downsized?.url,
      // Downsized URL to send to screen (avoids huge originals)
      url:
        gif.images.downsized?.url ??
        gif.images.fixed_height?.url ??
        gif.images.original?.url,
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach GIPHY" },
      { status: 502 }
    );
  }
}
