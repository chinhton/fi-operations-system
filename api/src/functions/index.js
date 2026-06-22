const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');
const { BlobServiceClient } = require('@azure/storage-blob');

// 1. Database & Blob Connections
const client = new CosmosClient(process.env.CosmosDbConnectionString || "");
const database = client.database("OmsDatabase");

const blobConnectionString = process.env.AzureWebJobsStorage || "";
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
            const { resource } = await container.items.create(payload);
            return createResponse(201, resource);
        }
    } catch (error) {
        return createResponse(500, { error: `Cosmos DB error on ${containerId}`, message: error.message });
    }
}

// --- COSMOS DB ENDPOINTS ---
app.http('assets', { methods: ['GET', 'POST'], authLevel: 'anonymous', handler: (req) => processRoute(req, 'assets') });
app.http('templates', { methods: ['GET', 'POST'], authLevel: 'anonymous', handler: (req) => processRoute(req, 'templates') });
app.http('history', { methods: ['GET', 'POST'], authLevel: 'anonymous', handler: (req) => processRoute(req, 'history') });
app.http('users', { methods: ['GET', 'POST'], authLevel: 'anonymous', handler: (req) => processRoute(req, 'users') });

// --- NEW BLOB STORAGE UPLOAD ENDPOINT ---
app.http('upload', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            if (!blobServiceClient) {
                return createResponse(500, { error: "Blob storage connection string missing in environment variables." });
            }

            const payload = await request.json();
            const { fileName, fileData } = payload;

            // Extract the base64 data and mime type from the React FileReader string
            const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                return createResponse(400, { error: "Invalid Base64 file format." });
            }

            const mimeType = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            
            // Clean the filename and add a timestamp to prevent overwriting identical names
            const cleanFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;

            // Connect to the public container you just made
            const containerClient = blobServiceClient.getContainerClient('equipment-manuals');
            const blockBlobClient = containerClient.getBlockBlobClient(cleanFileName);

            // Upload the file to Azure
            await blockBlobClient.uploadData(buffer, {
                blobHTTPHeaders: { blobContentType: mimeType }
            });

            // Return the permanent public URL to React
            return createResponse(201, { url: blockBlobClient.url, fileName: cleanFileName });

        } catch (error) {
            return createResponse(500, { error: "Blob upload failure", details: error.message });
        }
    }
});