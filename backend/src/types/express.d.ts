import { AuthResponse, CustomJwtPayload } from "../features/auth/auth.types";

declare global {
    namespace Express {
        interface Request {
            auth?: CustomJwtPayload;
            validated?: Partial<{
                body: unknown;
                params: unknown;
                query: unknown;
            }>;
        }
        interface User extends AuthResponse {

        }
    }
}