import { MongoClient } from 'mongodb';

class DBClient {
    constructor() {
        const {
            DB_HOST = 'localhost',
            DB_PORT = 27017,
            DB_DATABASE = 'files_manager'
        } = process.env;

        // MongoDB connection URI
        this.URI = `mongodb://${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;

        // Initialize MongoDB client
        this.client = new MongoClient(this.URI, { useUnifiedTopology: true });
        this.client.connect();

        // MongoDB collections
        this.usersCollection = this.client.db().collection('users');
        this.filesCollection = this.client.db().collection('files');
    }

    isAlive() {
        // Check if the MongoDB client is connected
        return this.client.isConnected();
    }

    async nbUsers() {
        // Get the number of documents in the users collection
        return this.usersCollection.countDocuments();
    }

    async nbFiles() {
        // Get the number of documents in the files collection
        return this.filesCollection.countDocuments();
    }
}

const dbClient = new DBClient();

export default dbClient;
