import { config } from "../config"
import { Prisma } from "../generated/prisma/client"
import jwt from 'jsonwebtoken'
type userType = Prisma.UserGetPayload<{}>

export const generateToken = (user : userType) => {
    const token = jwt.sign({
        id : user.id,
        email : user.email
        }, config.jwtSecret!, {
            expiresIn : '2h'
        }
    )

    return token;
}