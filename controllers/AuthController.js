import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const AuthController = {
    async getConnect(req, res) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Basic ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [email, password] = credentials.split(':');

        // Find user by email and password
        const user = await dbClient.usersCollection.findOne({ email, password: sha1(password) });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Generate token
        const token = uuidv4();
        const key = `auth_${token}`;

        // Store user ID in Redis with 24-hour expiration
        await redisClient.set(key, user._id.toString(), 24 * 60 * 60);

        res.status(200).json({ token });
    },

    async getDisconnect(req, res) {
        const { 'x-token': token } = req.headers;

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Delete token from Redis
        await redisClient.del(`auth_${token}`);

        res.status(204).end();
    }
};

export default AuthController;