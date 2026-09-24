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
          background: "#121f47",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#3a68e6",
              color: "#fff",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            s
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: -2,
            }}
          >
            sitecms
          </div>
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#c0d3fb",
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
