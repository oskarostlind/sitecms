import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cf5bb"/><stop offset="1" stop-color="#22c983"/></linearGradient></defs><g fill="url(#g)" stroke="url(#g)" stroke-width="1.8" stroke-linejoin="round"><path d="M16 3.8 L22.6 15 L9.4 15 Z"/><path d="M8 18 L24 18 L29 27 L3 27 Z"/></g></svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#060a18",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`} width={118} height={118} alt="" />
      </div>
    ),
    { ...size },
  );
}
