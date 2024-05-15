import fs from 'fs';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';
import fileQueue from './utils/fileQueue';

fileQueue.process(async (job) => {
    const { userId, fileId } = job.data;

    if (!fileId) {
        throw new Error('Missing fileId');
    }
    if (!userId) {
        throw new Error('Missing userId');
    }

    const file = await dbClient.filesCollection.findOne({ _id: fileId, userId });

    if (!file) {
        throw new Error('File not found');
    }

    // Generate thumbnails
    const thumbnailSizes = [500, 250, 100];
    for (const size of thumbnailSizes) {
        const thumbnailBuffer = await imageThumbnail(file.localPath, { width: size });
        const thumbnailPath = `${file.localPath}_${size}`;
        fs.writeFileSync(thumbnailPath, thumbnailBuffer);
    }
});