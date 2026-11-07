import { Interactive, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { Background } from "./Background";

// Price path: rises a little after entry, then falls through the stop
const PRICES = [50, 54, 58, 55, 60, 57, 52, 48, 44, 46, 40, 35, 38, 30, 24, 20];
const CHART_W = 900;
const CHART_H = 700;
const ENTRY = 50;
const STOP = 40;

const toY = (p: number) => CHART_H - (p / 70) * CHART_H;
const toX = (i: number) => (i / (PRICES.length - 1)) * CHART_W;

export const TradeScene: React.FC = () => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [20, 130], [0, PRICES.length - 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const whole = Math.floor(progress);
  const frac = progress - whole;
  const pts = PRICES.slice(0, whole + 1).map((p, i) => [toX(i), toY(p)]);
  if (whole < PRICES.length - 1) {
    const next = PRICES[whole + 1];
    const cur = PRICES[whole];
    pts.push([toX(whole + frac), toY(cur + (next - cur) * frac)]);
  }
  const last = pts[pts.length - 1];
  const priceNow = ((CHART_H - last[1]) / CHART_H) * 70;
  const pnl = ((priceNow - ENTRY) / ENTRY) * 100;
  const stopHit = priceNow < STOP && progress > 9;

  return (
    <Background>
      <Interactive.Div
        name="Headline"
        style={{
          fontSize: 84,
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: 60,
          opacity: interpolate(frame, [0, 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        You enter a trade.
        <br />
        <span style={{ color: COLORS.red }}>It goes against you.</span>
      </Interactive.Div>

      <svg width={CHART_W} height={CHART_H} style={{ overflow: "visible" }}>
        <line
          x1={0}
          x2={CHART_W}
          y1={toY(ENTRY)}
          y2={toY(ENTRY)}
          stroke={COLORS.muted}
          strokeWidth={3}
          strokeDasharray="12 12"
        />
        <text x={0} y={toY(ENTRY) - 16} fill={COLORS.muted} fontSize={36}>
          ENTRY
        </text>
        <line
          x1={0}
          x2={CHART_W}
          y1={toY(STOP)}
          y2={toY(STOP)}
          stroke={COLORS.red}
          strokeWidth={4}
          strokeDasharray="12 12"
        />
        <text x={0} y={toY(STOP) + 48} fill={COLORS.red} fontSize={36}>
          STOP LOSS
        </text>
        <polyline
          points={pts.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke={pnl >= 0 ? COLORS.green : COLORS.red}
          strokeWidth={10}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={last[0]} cy={last[1]} r={16} fill={COLORS.text} />
      </svg>

      <Interactive.Div
        name="PnL"
        style={{
          fontSize: 110,
          fontWeight: 900,
          marginTop: 50,
          color: pnl >= 0 ? COLORS.green : COLORS.red,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {pnl >= 0 ? "+" : ""}
        {pnl.toFixed(1)}%
      </Interactive.Div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          color: COLORS.red,
          height: 70,
          opacity: stopHit ? 1 : 0,
          scale: stopHit ? 1 : 0.6,
        }}
      >
        ⚠ STOP HIT — AND IGNORED
      </div>
    </Background>
  );
};
