import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const AppController = {
    async getStatus(req, res) {
        const redisIsAlive = redisClient.isAlive();
        const dbIsAlive = dbClient.isAlive();
        res.status(200).json({ redis: redisIsAlive, db: dbIsAlive });
    },

    async getStats(req, res) {
        const nbUsers = await dbClient.nbUsers();
        const nbFiles = await dbClient.nbFiles();
        res.status(200).json({ users: nbUsers, files: nbFiles });
    }
};

export default AppController;