import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "sitecms – låt kunden redigera hemsidan själv";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cf5bb"/><stop offset="1" stop-color="#22c983"/></linearGradient></defs><g fill="url(#g)" stroke="url(#g)" stroke-width="1.8" stroke-linejoin="round"><path d="M16 3.8 L22.6 15 L9.4 15 Z"/><path d="M8 18 L24 18 L29 27 L3 27 Z"/></g></svg>`;

export default async function OpengraphImage() {
  const planet = await readFile(join(process.cwd(), "public/planet/planet-og.png"));
  const planetSrc = `data:image/png;base64,${planet.toString("base64")}`;
  const markSrc = `data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "radial-gradient(120% 90% at 85% 100%, #0f1d4a 0%, #060a18 55%, #04060f 100%)",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={planetSrc} width={620} height={620} style={{ position: "absolute", right: -120, bottom: -190 }} alt="" />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 80px", width: 820 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={markSrc} width={64} height={64} alt="" />
            <div style={{ fontSize: 52, fontWeight: 800, color: "#f3f6ff", letterSpacing: -1.5 }}>sitecms</div>
          </div>
          <div style={{ marginTop: 44, fontSize: 64, fontWeight: 800, color: "#f3f6ff", lineHeight: 1.05, letterSpacing: -2 }}>
            Din hemsida,
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, color: "#5df0a8", lineHeight: 1.05, letterSpacing: -2 }}>
            utan handpåläggning
          </div>
          <div style={{ marginTop: 28, fontSize: 28, color: "#9aa6c4", lineHeight: 1.4 }}>
            Kunden redigerar texter, bilder och priser själv. Utvecklaren kopplar sajten på tio minuter.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
