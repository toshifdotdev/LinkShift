import crypto from "crypto";
export const generateRefreshToken = () => {
    return crypto.randomBytes(32).toString("hex");
}