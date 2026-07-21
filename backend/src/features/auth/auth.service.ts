import { prisma, config } from '../../config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const registerUser = async (name : string, email : string, password : string) => {
    const existingUser = await prisma.user.findUnique({
        where : {
            email
        }
    })
    if(!existingUser) {
        throw new Error("EmailAlreadyExistsError");
    }

    const hashPassword = await bcrypt.hash(password, 10); // saltRounds = 10
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