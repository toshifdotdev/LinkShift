import { spawn } from "child_process";

/**
 * Frame composition runs in an isolated child Node process.
 *
 * generateQr.ts replaces global window/document with JSDOM at module load,
 * which breaks sharp's multi-composite SVG pipeline inside THIS process.
 * A fresh process composes reliably (verified E2E).
 *
 * stdin : JSON { basePng(b64), frame, foregroundColor, backgroundColor }
 * stdout: composed PNG (base64)
 */
const WORKER_CODE = `
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (input += c));
  process.stdin.on("end", async () => {
    try {
      const sharp = require("sharp");
      const { basePng, frame, foregroundColor, backgroundColor } = JSON.parse(input);
      const specs = {
        clean:   { pad: 26, border: 6,  labelHeight: 0,  label: "",        borderColor: "fg",    text: "" },
        double:  { pad: 30, border: 4,  labelHeight: 0,  label: "",        borderColor: "fg",    text: "",  double: true },
        accent:  { pad: 24, border: 14, labelHeight: 0,  label: "",        borderColor: "ember", text: "",  double: false },
        label:   { pad: 26, border: 6,  labelHeight: 56, label: "SCAN ME", borderColor: "fg",    text: "SCAN ME", double: false },
        branded: { pad: 28, border: 8,  labelHeight: 58, label: "SCAN ME", borderColor: "ember", text: "SCAN ME", double: false },
      };
      const spec = specs[frame];
      const width = 300 + spec.pad * 2;
      const height = 300 + spec.pad * 2 + spec.labelHeight;
      const borderColor = spec.borderColor === "ember" ? "#E8590C" : foregroundColor;
      const base = Buffer.from(basePng, "base64");

      let composed = await sharp({ create: { width, height, channels: 4, background: backgroundColor } }).png().toBuffer();
      const overlay = Buffer.from('<svg width="' + width + '" height="' + height + '" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="' + width + '" height="' + height + '" rx="18" ry="18" fill="' + backgroundColor + '" stroke="' + borderColor + '" stroke-width="' + spec.border + '" />' + (spec.double ? '<rect x="' + (spec.border + 8) + '" y="' + (spec.border + 8) + '" width="' + (width - (spec.border + 8) * 2) + '" height="' + (height - (spec.border + 8) * 2 - (spec.labelHeight ? spec.labelHeight : 0)) + '" rx="12" fill="none" stroke="' + borderColor + '" stroke-width="2" />' : '') + '</svg>');
      composed = await sharp(composed).composite([{ input: overlay, top: 0, left: 0 }]).png().toBuffer();
      composed = await sharp(composed).composite([{ input: base, top: spec.pad, left: spec.pad }]).png().toBuffer();
      if (spec.labelHeight > 0) {
        const label = Buffer.from('<svg width="' + width + '" height="' + spec.labelHeight + '" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="' + width + '" height="' + spec.labelHeight + '" fill="' + borderColor + '" /><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="Georgia, serif" font-size="24" font-weight="600" letter-spacing="4" fill="#FFFFFF">' + spec.text + '</text></svg>');
        composed = await sharp(composed).composite([{ input: label, top: height - spec.labelHeight, left: 0 }]).png().toBuffer();
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
  frame: "clean" | "double" | "accent" | "label" | "branded",
  foregroundColor: string,
  backgroundColor: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["-e", WORKER_CODE],
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
