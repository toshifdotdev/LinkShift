import { CustomJwtPayload } from "../features/auth/auth.types";

declare global {
    namespace Express {
        interface Request {
            user?: CustomJwtPayload;
        }
    }
}