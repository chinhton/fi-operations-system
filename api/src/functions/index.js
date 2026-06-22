const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');
const { BlobServiceClient } = require('@azure/storage-blob');

// 1. Database & Blob Connections
const client = new CosmosClient(process.env.CosmosDbConnectionString || "");
const database = client.database("OmsDatabase");

const blobConnectionString = process.env.OMS_BLOB_CONNECTION || "";
let blobServiceClient;
if (blobConnectionString) {
    blobServiceClient = BlobServiceClient.fromConnectionString(blobConnectionString);
}

// 2. Response Formatter
const createResponse = (status, data) => ({
    status: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});

// 3. Standard Cosmos DB Router
async function processRoute(request, containerId) {
    const method = request.method;
    const container = database.container(containerId);
    try {
        if (method === 'GET') {
            const { resources } = await container.items.readAll().fetchAll();
            return createResponse(200, resources);
        }
        if (method === 'POST') {
            const payload = await request.json();
            
            // THE FIX: Changed .create() to .upsert() so it can overwrite existing records!
            const { resource } = await container.items.upsert(payload);
            
            return createResponse(201, resource);
        }
        if (method === 'DELETE') {
            const id = request.query.get('id');
            if (!id) return createResponse(400, { error: "Missing ID for deletion." });
            
            await container.item(id, id).delete();
            return createResponse(200, { message: "Item permanently deleted from database." });
        }
    } catch (error) {
        return createResponse(500, { error: `Cosmos DB error on ${containerId}`, message: error.message });
    }
}

// --- COSMOS DB ENDPOINTS ---
app.http('assets', { methods: ['GET', 'POST', 'DELETE'], authLevel: 'anonymous', handler: (req) => processRoute(req, 'assets') });
app.http('templates', { methods: ['GET', 'POST', 'DELETE'], authLevel: 'anonymous', handler: (req) => processRoute(req, 'templates') });
app.http('history', { methods: ['GET', 'POST', 'DELETE'], authLevel: 'anonymous', handler: (req) => processRoute(req, 'history') });
app.http('users', { methods: ['GET', 'POST', 'DELETE'], authLevel: 'anonymous', handler: (req) => processRoute(req, 'users') });

// --- BLOB STORAGE UPLOAD ENDPOINT ---
app.http('upload', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            if (!blobServiceClient) {
                return createResponse(500, { error: "Blob storage connection string missing from OMS_BLOB_CONNECTION." });
            }

            const payload = await request.json();
            const { fileName, fileData } = payload;

            if (!fileData || !fileData.includes(',')) {
                return createResponse(400, { error: "Invalid file format received." });
            }
            
            const mimeType = fileData.split(';')[0].split(':')[1];
            const base64String = fileData.split(',')[1];
            const buffer = Buffer.from(base64String, 'base64');
            
            const cleanFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const containerClient = blobServiceClient.getContainerClient('equipment-manuals');
            const blockBlobClient = containerClient.getBlockBlobClient(cleanFileName);

            await blockBlobClient.uploadData(buffer, {
                blobHTTPHeaders: { blobContentType: mimeType }
            });

            return createResponse(201, { url: blockBlobClient.url, fileName: cleanFileName });

        } catch (error) {
            return createResponse(500, { error: "Blob upload failure", details: error.message });
        }
    }
});