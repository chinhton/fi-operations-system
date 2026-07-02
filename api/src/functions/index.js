const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');
const { BlobServiceClient } = require('@azure/storage-blob');
const { EmailClient } = require('@azure/communication-email');

// Helper function to safely split comma-separated strings into Azure's required format
const formatRecipients = (emailString) => {
    if (!emailString) return [];
    return emailString
        .split(',')
        .map(email => ({ address: email.trim() }))
        .filter(obj => obj.address !== ""); // drop any accidental blanks
};

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
            
            // Changed .create() to .upsert() so it can overwrite existing records
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
app.http('workorders', { methods: ['GET', 'POST', 'DELETE'], authLevel: 'anonymous', handler: (req) => processRoute(req, 'workorders') });

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

// --- AZURE COMMUNICATION SERVICES EMAIL ENDPOINT ---
app.http('sendEmail', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const requestBody = await request.json();
            const { to, cc, subject, body } = requestBody;

            const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
            
            if (!connectionString) {
                context.log.error("Missing COMMUNICATION_SERVICES_CONNECTION_STRING environment variable.");
                return createResponse(500, { error: "Server misconfiguration: Connection string missing." });
            }

            const client = new EmailClient(connectionString);

            const emailMessage = {
                senderAddress: "DoNotReply@77bb0478-c5db-4ee5-8cf9-84265c1432a3.azurecomm.net",
                content: {
                    subject: subject || "Notification from FI Operations System",
                    plainText: body || "You have received an automated operational update.",
                },
                recipients: {
                    to: formatRecipients(to),
                },
            };

            if (cc) {
                emailMessage.recipients.cc = formatRecipients(cc);
            }

            const poller = await client.beginSend(emailMessage);
            const response = await poller.pollUntilDone();

            context.log(`Email dispatched successfully. Message ID: ${response.id}`);

            return createResponse(200, { message: "Email sent successfully via Azure ACS!", messageId: response.id });
        } catch (error) {
            context.log.error("Failed to send email via Azure:", error);
            return createResponse(500, { error: "Failed to send email backend-side.", details: error.message });
        }
    }
});