import { prisma } from "../config";
import { Prisma } from "../generated/prisma/client"
import { generateAccessToken } from "./jwt";
import { generateRefreshToken } from "./refreshToken";
import { hashToken } from "./token";

type userType = Prisma.UserGetPayload<{}>
type IssuedTokens = {
    accessToken: string;
    refreshToken: string;
};

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export const issueTokens = async(user : userType): Promise<IssuedTokens> => {
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = hashToken(refreshToken);

    await prisma.user.update({
        where : {
            id : user.id,
        },
        data : {
            refreshTokenHash : hashedRefreshToken,
            refreshTokenExpiresAt : new Date(Date.now() + THIRTY_DAYS)
        }
    })

    return {
        accessToken,
        refreshToken
    }

}