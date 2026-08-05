import { config } from "../config"
import { Prisma } from "../generated/prisma/client"
import jwt from 'jsonwebtoken'
type userType = Prisma.UserGetPayload<{}>

export const generateAccessToken = (user : userType) => {
    const accessToken = jwt.sign({
        id : user.id,
        email : user.email
        }, config.jwtSecret!, {
            expiresIn : '15m'
        }
    )
    return accessToken;
}