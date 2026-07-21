import { prisma, config } from '../../config';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../../errors/AppError';

export const registerUser = async (name : string, email : string, password : string) => {

    const existingUser = await prisma.user.findUnique({
        where : {
            email
        }
    })
    if(existingUser !== null) {
        throw new AppError("Conflict",409);
    }
    const hashPassword = await bcrypt.hash(password , 10); // saltRounds = 10
    const createdUser = await prisma.user.create({
                        data : {
                            name,
                            email,
                            password : hashPassword
                        }
                    })
    const token = jwt.sign({
                    id : createdUser.id, 
                    email : createdUser.email}, 
                    config.jwtSecret!, {
                        expiresIn : '2h'
                    })
    return {
        user : {
            id : createdUser.id,
            name : createdUser.name,
            email : createdUser.email,
            createdAt :createdUser.createdAt
            },
        token
    }

}   