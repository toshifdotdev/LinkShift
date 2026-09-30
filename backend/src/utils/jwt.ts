import { config } from "../config"
import { Prisma } from "../generated/prisma/client"
import jwt from 'jsonwebtoken'
type userType = Prisma.UserGetPayload<{}>

/**
 * Access tokens are signed exclusively with HS256. Pinning the accepted
 * algorithm on verify stops a token that declares a different algorithm
 * (`alg: none`, or RS256 with the HMAC secret misused as a public key) from
 * being accepted. Sign and verify must share this constant.
 */
export const JWT_ALGORITHM = "HS256" as const

export const generateAccessToken = (user : userType) => {
    const accessToken = jwt.sign({
        id : user.id,
        email : user.email
        }, config.jwtSecret!, {
            algorithm : JWT_ALGORITHM,
            expiresIn : '15m'
        }
    )
    return accessToken;
}