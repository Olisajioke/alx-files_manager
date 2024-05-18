import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import userQueue from '../utils/userQueue'; // Import userQueue for background processing

const UsersController = {
    async postUsers(req, res) {
        const { email, password } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Missing email' });
        }
        if (!password) {
            return res.status(400).json({ error: 'Missing password' });
        }

        // Check if the email already exists
        const existingUser = await dbClient.usersCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Already exist' });
        }

        // Create new user in MongoDB
        const newUser = await dbClient.usersCollection.insertOne({ email, password });

        // Add a job to the userQueue for sending a welcome email
        userQueue.add({ userId: newUser.insertedId, email });

        return res.status(201).json({ id: newUser.insertedId, email });
    },

    async getMe(req, res) {
        const token = req.headers['x-token'];

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get user ID from Redis
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Retrieve user from MongoDB
        const user = await dbClient.usersCollection.findOne({ _id: userId });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        res.status(200).json({ id: user._id, email: user.email });
    }
};

export default UsersController;
