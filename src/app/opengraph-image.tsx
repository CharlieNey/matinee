import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * The social card (og:image / twitter:image), generated at build time.
 * Deliberately typographic — no poster art, so nothing copyrighted ships in
 * link previews — and drawn from the DESIGN.md language: program-paper cream,
 * espresso ink, one vermilion accent, a gilt hairline inside the frame, House
 * Velvet (Bodoni) for the wordmark. The TTFs in assets/ are vendored copies
 * of the app's two OFL-licensed faces, since next/og can't reach next/font's.
 */

export const alt =
  "Matinee — the live board for Broadway rush, lotteries, and cheap seats";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CREAM = "#f5efe3";
const INK_SOFT = "#8c7a7e";
const ESPRESSO = "#3a0d19";
const VERMILION = "#a61e33";
const GOLD = "#c9a227";

export default async function Image() {
  const [bodoni, schibsted] = await Promise.all([
    readFile(join(process.cwd(), "assets/BodoniModa-Bold.ttf")),
    readFile(join(process.cwd(), "assets/SchibstedGrotesk-Medium.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: CREAM,
          padding: 28,
          fontFamily: "Schibsted Grotesk",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            border: `2px solid ${ESPRESSO}`,
            borderRadius: 4,
            padding: 20,
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              border: `1px solid ${GOLD}`,
              borderRadius: 2,
              padding: "50px 64px 42px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 23,
                letterSpacing: 7,
                color: INK_SOFT,
              }}
            >
              BROADWAY &amp; OFF-BROADWAY · NYC
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: "Bodoni Moda",
                  fontSize: 168,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: ESPRESSO,
                }}
              >
                Matinee
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginTop: 14,
                  fontSize: 34,
                  lineHeight: 1.35,
                  color: INK_SOFT,
                }}
              >
                <div style={{ display: "flex" }}>
                  The live board for Broadway rush,
                </div>
                <div style={{ display: "flex" }}>
                  lotteries, and cheap seats.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                fontSize: 26,
              }}
            >
              <div style={{ display: "flex", color: INK_SOFT }}>
                Rush · Lottery · TKTS · Trip mode
              </div>
              <div style={{ display: "flex", color: VERMILION }}>
                matinee.nyc
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Bodoni Moda",
          data: bodoni,
          weight: 700,
          style: "normal",
        },
        {
          name: "Schibsted Grotesk",
          data: schibsted,
          weight: 500,
          style: "normal",
        },
      ],
    },
  );
}
