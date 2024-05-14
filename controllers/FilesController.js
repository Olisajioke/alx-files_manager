import fs from 'fs';
import path from 'path';
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
        const file = await dbClient.filesCollection.findOne({ _id: id, userId });
        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }

        return res.json(file);
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
        const files = await dbClient.filesCollection
            .find({ parentId, userId })
            .skip(skip)
            .limit(limit)
            .toArray();

        return res.json(files);
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
        const file = await dbClient.filesCollection.findOneAndUpdate(
            { _id: id, userId },
            { $set: { isPublic: true } },
            { returnDocument: 'after' }
        );
    
        if (!file.value) {
            return res.status(404).json({ error: 'Not found' });
        }
    
        return res.json(file.value);
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
        const file = await dbClient.filesCollection.findOneAndUpdate(
            { _id: id, userId },
            { $set: { isPublic: false } },
            { returnDocument: 'after' }
        );
    
        if (!file.value) {
            return res.status(404).json({ error: 'Not found' });
        }
    
        return res.json(file.value);
    },
    
};

export default FilesController;