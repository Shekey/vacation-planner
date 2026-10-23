import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS, which doesn't use SVG icons: the calendar-check mark from icon.svg, full bleed. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0878a4" }}>
        <svg width="112" height="112" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v3" />
          <path d="M16 2v3" />
          <path d="M21 13V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.5" />
          <path d="M3 9h18" />
          <path d="m16 19 2 2 4-4" />
        </svg>
      </div>
    ),
    size,
  );
}
