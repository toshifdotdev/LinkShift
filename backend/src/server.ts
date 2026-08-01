import { app } from "./app";
import { config } from "./config";
import { connectRedis } from "./config/redis";

const startServer = async() => {
    await connectRedis();
    
    app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
});
}
startServer();
