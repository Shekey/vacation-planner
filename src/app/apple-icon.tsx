import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS, which doesn't use SVG icons. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0ea5e9", position: "relative" }}>
        <div style={{ position: "absolute", top: 34, right: 34, width: 46, height: 46, borderRadius: 23, background: "#fde047" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 52, background: "#ffffff", borderTopLeftRadius: 90, borderTopRightRadius: 90 }} />
      </div>
    ),
    size,
  );
}
