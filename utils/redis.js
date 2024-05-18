import redis from 'redis';

class RedisClient {
  constructor() {
    this.client = redis.createClient();

    // Display any errors from the redis client
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
  }

  isAlive() {
    // Check if the redis client is connected
    return this.client.connected;
  }

  async get(key) {
    // Get the value for the specified key from Redis
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, value) => {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
  }

  async set(key, value, durationInSeconds) {
    // Set the value for the specified key in Redis with an expiration
    return new Promise((resolve, reject) => {
      this.client.setex(key, durationInSeconds, value, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  async del(key) {
    // Delete the value for the specified key from Redis
    return new Promise((resolve, reject) => {
      this.client.del(key, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
}

const redisClient = new RedisClient();

export default redisClient;
