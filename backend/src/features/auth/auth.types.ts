import { JwtPayload } from "jsonwebtoken";

export interface CustomJwtPayload extends JwtPayload {
    id : string,
    email : string
}

export type GoogleProfile = {
    id: string;

    displayName: string;

    emails?: {
        value: string;
    }[];

    photos?: {
        value: string;
    }[];
}

export type AuthResponse = {
    user: {
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
    };
    accessToken : string,
    refreshToken : string
};

export type RefreshedTokens = {
    accessToken: string;
    refreshToken: string;
};
