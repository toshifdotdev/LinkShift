import { AppError } from "../errors/AppError";

/**
 * QR logo fetching boundary.
 *
 * `logoUrl` is accepted on `POST /api/v1/qr/:id` and the server fetches it to
 * inline it into the generated image. Without a boundary that fetch is a
 * server-side request forgery: any authenticated Creator/Pro user could make
 * the server retrieve `http://169.254.169.254/latest/meta-data/` or an
 * internal service and receive the bytes back inside the QR image.
 *
 * In practice a logo URL is only ever produced by `POST /api/v1/qr/logo`,
 * which uploads the file to Cloudinary and returns a `res.cloudinary.com`
 * `secure_url`; the studio has no field for pasting an arbitrary URL. So the
 * correct boundary is an allow-list of that delivery host rather than a
 * generic "any public address" check — it is stricter, and it breaks no
 * legitimate flow. Extra hosts can be added with QR_LOGO_ALLOWED_HOSTS.
 */
const DEFAULT_ALLOWED_HOSTS = ["res.cloudinary.com"];

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_REDIRECTS = 3;

export const qrLogoAllowedHosts = (): string[] => {
    const configured = process.env.QR_LOGO_ALLOWED_HOSTS;
    const source =
        typeof configured === "string" && configured.trim().length > 0
            ? configured
            : DEFAULT_ALLOWED_HOSTS.join(",");

    return source
        .split(",")
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean);
};

const hostIsAllowed = (hostname: string, allowed: string[]): boolean => {
    const host = hostname.toLowerCase();
    return allowed.some((entry) => host === entry || host.endsWith(`.${entry}`));
};

/**
 * Validate a logo URL for server-side fetching. Throws when the URL is
 * malformed, not HTTPS, or not on the allow-list.
 */
export const assertFetchableLogoUrl = (rawUrl: string): URL => {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        throw new AppError("Invalid logo URL.", 400);
    }

    if (url.protocol !== "https:") {
        throw new AppError("Logo URL must use HTTPS.", 400);
    }

    if (!hostIsAllowed(url.hostname, qrLogoAllowedHosts())) {
        throw new AppError(
            "Logo URL host is not an approved image host. Upload the logo through the QR studio instead.",
            400,
        );
    }

    return url;
};

const readCapped = async (res: Response, maxBytes: number): Promise<Buffer> => {
    const declared = Number(res.headers.get("content-length") ?? "");
    if (Number.isFinite(declared) && declared > maxBytes) {
        throw new AppError("Logo image is too large.", 413);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
        throw new AppError("Logo image is too large.", 413);
    }
    return buffer;
};

/**
 * Fetch an allow-listed logo and return it as a data URI, or `null` when the
 * logo cannot be retrieved. Returning `null` preserves the existing graceful
 * degradation: a QR is still generated, just without the logo overlay.
 *
 * Redirects are followed manually (bounded) and each hop is re-validated
 * against the allow-list, so an approved host cannot bounce the server to an
 * internal address.
 */
export const fetchLogoAsDataUri = async (
    rawUrl: string,
    options: { maxBytes?: number; timeoutMs?: number } = {},
): Promise<string | null> => {
    const maxBytes = options.maxBytes ?? MAX_LOGO_BYTES;
    const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;

    let current = assertFetchableLogoUrl(rawUrl);

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const response = await fetch(current, {
            redirect: "manual",
            signal: AbortSignal.timeout(timeoutMs),
        });

        const location = response.headers.get("location");
        if (response.status >= 300 && response.status < 400 && location) {
            if (hop === MAX_REDIRECTS) {
                throw new AppError("Logo URL redirected too many times.", 400);
            }
            current = assertFetchableLogoUrl(new URL(location, current).toString());
            continue;
        }

        if (!response.ok) {
            throw new AppError("Logo image could not be retrieved.", 502);
        }

        const buffer = await readCapped(response, maxBytes);
        const contentType = response.headers.get("content-type") ?? "image/png";
        return `data:${contentType};base64,${buffer.toString("base64")}`;
    }

    throw new AppError("Logo URL redirected too many times.", 400);
};

/**
 * `generateQrImage` composites whatever it is given, so it must only ever
 * receive an already-inlined data URI. Rejecting anything else here is
 * defence in depth against a second server-side fetch sink.
 */
export const assertInlineLogo = (value: string): string => {
    if (!value.startsWith("data:image/")) {
        throw new AppError("Logo must be an inlined image.", 400);
    }
    return value;
};