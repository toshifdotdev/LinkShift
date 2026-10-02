/**
 * Tag name rules, shared by the picker and the API layer.
 *
 * Mirrors the backend constraints in `tag.service.ts`. Kept here so the client
 * can reject an over-long name before a round-trip instead of showing the
 * server's error afterwards. If the two ever disagree the server's copy wins,
 * so this is a convenience rather than a security boundary.
 */
export const MAX_TAG_NAME_LENGTH = 30;

/**
 * Lower-cased and trimmed.
 *
 * The backend does the same before storing, which is what makes "Launch",
 * "launch" and "LAUNCH" one tag instead of three. Normalising here as well
 * means the picker cannot show a chip the list filter will not match.
 */
export const normaliseTagName = (raw: string): string => raw.trim().toLowerCase();

export const isValidTagName = (raw: string): boolean => {
    const name = normaliseTagName(raw);
    return name.length > 0 && name.length <= MAX_TAG_NAME_LENGTH;
};