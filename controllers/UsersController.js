import dbClient from '../utils/db';
import sha1 from 'sha1';

const UsersController = {
    async postNew(req, res) {
        const { email, password } = req.body;

        // Check if email and password are provided
        if (!email) {
            return res.status(400).json({ error: 'Missing email' });
        }
        if (!password) {
            return res.status(400).json({ error: 'Missing password' });
        }

        // Check if the email already exists in DB
        const userExists = await dbClient.usersCollection.findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: 'Already exist' });
        }

        // Hash the password using SHA1
        const hashedPassword = sha1(password);

        // Create new user in DB
        const newUser = {
            email,
            password: hashedPassword
        };
        const result = await dbClient.usersCollection.insertOne(newUser);

        // Return the new user with only the email and the id
        const { _id } = result.insertedId;
        const responseUser = { id: _id, email };
        res.status(201).json(responseUser);
    }
};

export default UsersController;