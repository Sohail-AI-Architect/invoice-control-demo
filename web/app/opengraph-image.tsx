import { ImageResponse } from "next/og";

/**
 * Link-preview card, generated at build/request time by Next so there is no
 * binary image asset to keep in sync with the palette.
 *
 * Rendered by satori: inline styles only, flexbox only, no CSS classes.
 *
 * Runs on the edge runtime deliberately. The Node build of the bundled
 * @vercel/og resolves its default font via fileURLToPath, which throws
 * "Invalid URL" on Windows paths during static prerender; the edge build does
 * not take that code path. Edge is also the runtime Vercel serves OG images on.
 */

export const runtime = "edge";

export const alt =
  "Invoice Control — a maker/checker verification demo. Panel A issues a verdict, panel B independently re-derives it.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#14171C";
const RAISED = "#191D23";
const LINE = "#262B33";
const AMBER = "#C88A3A";
const AMBER_WASH = "#2A2115";
const ASH = "#E6E8EB";
const ASH_DIM = "#9AA2AD";
const FLAG = "#D06B5E";
const FLAG_WASH = "#2B1917";
const APPROVE = "#5C9A69";
const APPROVE_WASH = "#16221A";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: INK,
          padding: "56px 64px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 46,
                height: 46,
                border: `2px solid ${AMBER}`,
                backgroundColor: AMBER_WASH,
                color: AMBER,
                fontSize: 20,
                letterSpacing: 1,
                marginRight: 18,
              }}
            >
              IC
            </div>
            <div
              style={{
                color: ASH_DIM,
                fontSize: 22,
                letterSpacing: 3,
              }}
            >
              INVOICE CONTROL
            </div>
          </div>

          <div
            style={{
              color: ASH,
              fontSize: 54,
              lineHeight: 1.15,
              marginTop: 30,
              maxWidth: 900,
            }}
          >
            Maker/checker separation of duties
          </div>
          <div
            style={{
              color: ASH_DIM,
              fontSize: 24,
              lineHeight: 1.4,
              marginTop: 16,
              maxWidth: 860,
            }}
          >
            One process decides. A second re-derives the verdict independently — and
            catches it when the first one is wrong.
          </div>
        </div>

        {/* Two mini panels */}
        <div style={{ display: "flex", alignItems: "stretch", marginTop: 44 }}>
          <MiniPanel
            letter="A"
            title="Maker"
            badge="APPROVED"
            badgeColor={APPROVE}
            badgeBg={APPROVE_WASH}
            note="claims the invoice is fine"
            accent
          />
          <div style={{ width: 22 }} />
          <MiniPanel
            letter="B"
            title="Checker"
            badge="MISMATCH"
            badgeColor={FLAG}
            badgeBg={FLAG_WASH}
            note="rule 1 fired — should be FLAG"
          />
        </div>
      </div>
    ),
    size,
  );
}

function MiniPanel({
  letter,
  title,
  badge,
  badgeColor,
  badgeBg,
  note,
  accent = false,
}: {
  letter: string;
  title: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        border: `1px solid ${LINE}`,
        backgroundColor: RAISED,
        padding: "22px 26px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            border: `1px solid ${accent ? AMBER : LINE}`,
            backgroundColor: accent ? AMBER_WASH : INK,
            color: accent ? AMBER : ASH_DIM,
            fontSize: 15,
            marginRight: 14,
          }}
        >
          {letter}
        </div>
        <div style={{ color: ASH, fontSize: 25 }}>{title}</div>
      </div>

      <div style={{ display: "flex", marginTop: 20 }}>
        <div
          style={{
            display: "flex",
            border: `1px solid ${badgeColor}`,
            backgroundColor: badgeBg,
            color: badgeColor,
            fontSize: 19,
            letterSpacing: 2,
            padding: "7px 14px",
          }}
        >
          {badge}
        </div>
      </div>

      <div style={{ color: ASH_DIM, fontSize: 20, marginTop: 16 }}>{note}</div>
    </div>
  );
}
