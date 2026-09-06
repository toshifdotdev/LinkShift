import { spawn } from "child_process";


export const FRAME_SPECS = {
    none:    { border: 0, pad: 0,  labelHeight: 0, labelText: "",        ember: false, double: false },
    clean:   { border: 6, pad: 26, labelHeight: 0, labelText: "",        ember: false, double: false },
    double:  { border: 4, pad: 30, labelHeight: 0, labelText: "",        ember: false, double: true },
    accent:  { border: 14, pad: 24, labelHeight: 0, labelText: "",       ember: true,  double: false },
    label:   { border: 6, pad: 26, labelHeight: 56, labelText: "SCAN ME", ember: false, double: false },
    branded: { border: 8, pad: 28, labelHeight: 58, labelText: "SCAN ME", ember: true,  double: false },
} as const;

export type FrameStyle = keyof typeof FRAME_SPECS;


export const LABEL_GAP = 8;
export const LABEL_RADIUS = 6;

const QR_SIZE = 300;
const OUTER_RADIUS = 18;


const WORKER_CODE = (specsJson: string) => `
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (input += c));
  process.stdin.on("end", async () => {
    try {
      const sharp = require("sharp");
      const { basePng, frame, foregroundColor, backgroundColor } = JSON.parse(input);
      const specs = ${specsJson};
      const spec = specs[frame];
      const QR = 300, LABEL_GAP = 8, LABEL_RADIUS = 6, R = 18;
      const borderColor = spec.ember ? "#E8590C" : foregroundColor;
      const labelTextColor = spec.ember ? "#F5F1EB" : backgroundColor;

      // border-box width — border and pad both take space (CSS model)
      const W = QR + 2 * (spec.border + spec.pad);
      const H = W + (spec.labelHeight > 0 ? LABEL_GAP + spec.labelHeight : 0);

      let composed = await sharp({ create: { width: W, height: H, channels: 4, background: backgroundColor } }).png().toBuffer();

      // Rounded-rect path at inset i (CSS corner radius follows the inset).
      const rc = (i) => Math.max(R - i, 0);
      const rr = (i) =>
        "M" + (i + rc(i)) + " " + i +
        "H" + (W - i - rc(i)) +
        "A" + rc(i) + " " + rc(i) + " 0 0 1 " + (W - i) + " " + (i + rc(i)) +
        "V" + (H - i - rc(i)) +
        "A" + rc(i) + " " + rc(i) + " 0 0 1 " + (W - i - rc(i)) + " " + (H - i) +
        "H" + (i + rc(i)) +
        "A" + rc(i) + " " + rc(i) + " 0 0 1 " + i + " " + (H - i - rc(i)) +
        "V" + (i + rc(i)) +
        "A" + rc(i) + " " + rc(i) + " 0 0 1 " + (i + rc(i)) + " " + i + "Z";
      // Solid ring band [inset, inset+thickness] via evenodd double path.
      const ring = (inset, thick) => rr(inset) + rr(inset + thick);

      // Frame bands cover the FULL canvas (incl. the label strip) — the
      // border wraps the whole box, exactly like the preview's CSS border.
      let bands = '<path fill="' + borderColor + '" fill-rule="evenodd" d="' + ring(0, spec.border) + '"/>';
      if (spec.double) {
        const gap = Math.max(spec.border - 4, 2);
        bands += '<path fill="' + backgroundColor + '" fill-rule="evenodd" d="' + ring(spec.border, gap) + '"/>';
        bands += '<path fill="' + borderColor + '" fill-rule="evenodd" d="' + ring(spec.border + gap, spec.border - gap) + '"/>';
      }
      const overlay = Buffer.from('<svg width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg">' + bands + '</svg>');
      composed = await sharp(composed).composite([{ input: overlay, top: 0, left: 0 }]).png().toBuffer();

      // QR placed at (border+pad, border+pad), width = QR (300).
      const qc = spec.border + spec.pad;
      const base = Buffer.from(basePng, "base64");
      composed = await sharp(composed).composite([{ input: base, top: qc, left: qc }]).png().toBuffer();

      // Label: same width as the QR content (300), centered under it with a
      // LABEL_GAP gap — mirrors the preview <p> beneath the SVG.
      if (spec.labelHeight > 0) {
        const lw = QR, lh = spec.labelHeight;
        const lx = qc, ly = qc + QR + LABEL_GAP;
        const fontSize = spec.ember ? 23 : 26;
        const letterSpacing = spec.ember ? 3 : 6;
        const label = Buffer.from(
          '<svg width="' + lw + '" height="' + lh + '" xmlns="http://www.w3.org/2000/svg">' +
          '<rect x="0" y="0" width="' + lw + '" height="' + lh + '" rx="' + LABEL_RADIUS + '" fill="' + borderColor + '" />' +
          '<text x="50%" y="' + (lh / 2) + '" dominant-baseline="central" text-anchor="middle" font-family="Georgia, serif" font-size="' + fontSize + '" font-weight="600" letter-spacing="' + letterSpacing + '" fill="' + labelTextColor + '">' + spec.labelText + '</text>' +
          '</svg>');
        composed = await sharp(composed).composite([{ input: label, top: ly, left: lx }]).png().toBuffer();
      }
      process.stdout.write(composed.toString("base64"));
    } catch (err) {
      console.error(err && err.message ? err.message : err);
      process.exit(1);
    }
  });
`;

export function composeQrFrameInChild(
  basePng: Buffer,
  frame: Exclude<FrameStyle, "none">,
  foregroundColor: string,
  backgroundColor: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["-e", WORKER_CODE(JSON.stringify(FRAME_SPECS))],
      { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] },
    );
    const out: Buffer[] = [];
    let errText = "";
    child.stdout.on("data", (c) => out.push(c));
    child.stderr.on("data", (c) => (errText += c.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.from(out.join(""), "base64"));
      else reject(new Error(`Frame composition failed: ${errText.slice(0, 200)}`));
    });
    child.stdin.write(JSON.stringify({
      basePng: basePng.toString("base64"),
      frame,
      foregroundColor,
      backgroundColor,
    }));
    child.stdin.end();
  });
}