import Queue from 'bull';

const userQueue = new Queue('fileQueue');

export default userQueue;
