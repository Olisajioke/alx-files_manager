import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const FilesController = {
    async postUpload(req, res) {
        const { 'x-token': token } = req.headers;
        const { name, type, parentId = '0', isPublic = false, data } = req.body;

        // Retrieve user based on token
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if name and type are provided
        if (!name) {
            return res.status(400).json({ error: 'Missing name' });
        }
        if (!type || !['folder', 'file', 'image'].includes(type)) {
            return res.status(400).json({ error: 'Missing type or invalid type' });
        }

        // Handle file upload
        if (type !== 'folder') {
            if (!data) {
                return res.status(400).json({ error: 'Missing data' });
            }

            // Decode base64 data and write to disk
            const decodedData = Buffer.from(data, 'base64');
            const fileId = uuidv4();
            const filePath = path.join(FOLDER_PATH, fileId);
            fs.writeFileSync(filePath, decodedData);

            // Save file to database
            await dbClient.filesCollection.insertOne({
                userId,
                name,
                type,
                isPublic,
                parentId,
                localPath: filePath
            });

            return res.status(201).json({
                id: fileId,
                userId,
                name,
                type,
                isPublic,
                parentId
            });
        }

        // Handle folder creation
        const newFolder = {
            userId,
            name,
            type,
            isPublic,
            parentId
        };

        await dbClient.filesCollection.insertOne(newFolder);

        return res.status(201).json({
            id: newFolder._id,
            userId,
            name,
            type,
            isPublic,
            parentId
        });
    },

    async getShow(req, res) {
        const { 'x-token': token } = req.headers;
        const { id } = req.params;

        // Retrieve user based on token
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Retrieve file document based on ID
        try {
            const file = await dbClient.filesCollection.findOne({ _id: id, userId });
            if (!file) {
                return res.status(404).json({ error: 'Not found' });
            }

            return res.json(file);
        } catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    },

    async getIndex(req, res) {
        const { 'x-token': token } = req.headers;
        const { parentId = '0', page = 0 } = req.query;

        // Retrieve user based on token
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Calculate pagination limits
        const limit = 20;
        const skip = page * limit;

        // Retrieve file documents based on parentId and pagination
        try {
            const files = await dbClient.filesCollection
                .find({ parentId, userId })
                .skip(skip)
                .limit(limit)
                .toArray();

            return res.json(files);
        } catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    },

    async putPublish(req, res) {
        const { 'x-token': token } = req.headers;
        const { id } = req.params;

        // Retrieve user based on token
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Find file document and update isPublic to true
        try {
            const file = await dbClient.filesCollection.findOneAndUpdate(
                { _id: id, userId },
                { $set: { isPublic: true } },
                { returnDocument: 'after' }
            );

            if (!file.value) {
                return res.status(404).json({ error: 'Not found' });
            }

            return res.json(file.value);
        } catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    },

    async putUnpublish(req, res) {
        const { 'x-token': token } = req.headers;
        const { id } = req.params;

        // Retrieve user based on token
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Find file document and update isPublic to false
        try {
            const file = await dbClient.filesCollection.findOneAndUpdate(
                { _id: id, userId },
                { $set: { isPublic: false } },
                { returnDocument: 'after' }
            );

            if (!file.value) {
                return res.status(404).json({ error: 'Not found' });
            }

            return res.json(file.value);
        } catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    },

    async getFile(req, res) {
        const { 'x-token': token } = req.headers;
        const { id } = req.params;
        const { size } = req.query;

        // Retrieve user based on token
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Retrieve file document based on ID
        try {
            const file = await dbClient.filesCollection.findOne({ _id: id });

            // Check if file exists
            if (!file) {
                return res.status(404).json({ error: 'Not found' });
            }

            // Check if the file is public or user is authenticated and owner of the file
            if (!file.isPublic && userId !== file.userId) {
                return res.status(404).json({ error: 'Not found' });
            }

            // Check if file type is folder
            if (file.type === 'folder') {
                return res.status(400).json({ error: "A folder doesn't have content" });
            }

            // Check if the file is locally present
            const filePath = file.localPath;
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'Not found' });
            }

            // Append size to file path if provided
            const modifiedFilePath = size ? `${filePath}_${size}` : filePath;

            // Check if the modified file path exists
            if (fs.existsSync(modifiedFilePath)) {
                // Get the MIME-type based on the name of the file
                const mimeType = mime.getType(file.name);
                res.set('Content-Type', mimeType);
                fs.createReadStream(modifiedFilePath).pipe(res);
            } else {
                return res.status(404).json({ error: 'Not found' });
            }
        } catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
};

export default FilesController;