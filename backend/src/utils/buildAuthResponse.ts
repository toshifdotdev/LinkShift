import { Prisma } from "../generated/prisma/client";

type userType = Prisma.UserGetPayload<{}>


export const buildAuthResponse = (user: userType, accessToken : string, refreshToken : string) => ({
    user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl
    },
    accessToken,
    refreshToken
});