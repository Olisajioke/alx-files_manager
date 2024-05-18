const { MongoClient } = require('mongodb');

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${host}:${port}`;

class DBClient {
  constructor() {
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.db = null;
    this.usersCollection = null;
    this.filesCollection = null;
    this.connect();
  }

  async connect() {
    try {
      await this.client.connect();
      this.db = this.client.db(database);
      this.usersCollection = this.db.collection('users');
      this.filesCollection = this.db.collection('files');
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error('Failed to connect to MongoDB', err);
    }
  }

  isAlive() {
    return !!this.db;
  }

  async nbUsers() {
    if (!this.usersCollection) {
      throw new Error('Database not initialized');
    }
    return this.usersCollection.countDocuments();
  }

  async nbFiles() {
    if (!this.filesCollection) {
      throw new Error('Database not initialized');
    }
    return this.filesCollection.countDocuments();
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
