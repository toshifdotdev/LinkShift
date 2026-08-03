import { app } from "./app";
import { config } from "./config";
import { connectRedis } from "./config/redis";
import passport from "passport";
import "./features/auth/google.strategy";

const startServer = async() => {
    await connectRedis();

    app.use(passport.initialize());
    
    app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
});
}
startServer();
