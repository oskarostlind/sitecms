import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#171717",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            color: "white",
            letterSpacing: -2,
          }}
        >
          sitecms
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#a3a3a3",
            marginTop: 28,
            maxWidth: 900,
          }}
        >
          Redigera din hemsida — enkelt och tryggt.
        </div>
      </div>
    ),
    { ...size },
  );
}
