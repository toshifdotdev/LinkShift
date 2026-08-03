import { Prisma } from "../generated/prisma/client";
import { generateToken } from "./jwt";

type userType = Prisma.UserGetPayload<{}>


export const buildAuthResponse = (user: userType) => ({
    user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl
    },
    token: generateToken(user)
});