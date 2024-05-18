import express from 'express';
import dbClient from './utils/db';
import routes from './routes/index';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use('/', routes);

const startServer = async () => {
  // Wait for the DB connection to be ready
  while (!dbClient.isAlive()) {
    console.log('Waiting for database connection...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before checking again
  }

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

startServer();
