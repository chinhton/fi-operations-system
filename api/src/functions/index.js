const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');
const { BlobServiceClient } = require('@azure/storage-blob');
const { EmailClient } = require('@azure/communication-email');

// 1. Response Formatter
const createResponse = (status, data) => ({
    status: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});

// 2. Lazy Initialization Variables
let database = null;
let blobServiceClient = null;

// Helper to safely boot Cosmos DB only when needed
const getDatabase = () => {
    if (!database) {
        const connString = process.env.CosmosDbConnectionString;
        if (!connString) throw new Error("CosmosDbConnectionString is missing from Azure Environment Variables.");
        const client = new CosmosClient(connString);
        database = client.database("OmsDatabase");
    }
    return database;
};

// Helper to safely boot Blob Storage only when needed
const getBlobClient = () => {
    if (!blobServiceClient) {
        const connString = process.env.OMS_BLOB_CONNECTION;
        if (!connString) throw new Error("OMS_BLOB_CONNECTION is missing from Azure Environment Variables.");
        blobServiceClient = BlobServiceClient.fromConnectionString(connString);
    }
    return blobServiceClient;
};

// Helper for Email Recipients
const formatRecipients = (emailInput) => {
    if (!emailInput) return [];
    
    const emailString = String(emailInput); 
    return emailString
        .split(',')
        .map(email => ({ address: email.trim() }))
        .filter(obj => obj.address !== ""); // Drop any accidental blank spaces
};

// 3. Standard Cosmos DB Router
async function processRoute(request, containerId) {
    try {
        const db = getDatabase(); 
        const method = request.method;
        const container = db.container(containerId);
        
        if (method === 'GET') {
            const { resources } = await container.items.readAll().fetchAll();
            return createResponse(200, resources);
        }
        if (method === 'POST') {
            const payload = await request.json();
            const { resource } = await container.items.upsert(payload);
            return createResponse(201, resource);
        }
        if (method === 'DELETE') {
            const id = request.query.get('id');
            if (!id) return createResponse(400, { error: "Missing ID for deletion." });
            
            const { resource: containerDef } = await container.read();
            const pkPath = containerDef.partitionKey.paths[0].substring(1); 
            
            const querySpec = {
                query: "SELECT * FROM c WHERE c.id = @id",
                parameters: [{ name: "@id", value: id }]
            };
            const { resources } = await container.items.query(querySpec).fetchAll();
            
            if (resources.length === 0) {
                return createResponse(404, { error: "Item not found in database." });
            }
            
            const item = resources[0];
            const pkValue = item[pkPath]; 
            
            await container.item(id, pkValue !== undefined ? pkValue : id).delete();
            
            return createResponse(200, { message: "Item permanently deleted from database." });
        }
    } catch (error) {
        return createResponse(500, { 
            error: `Cosmos DB error on ${containerId}`, 
            message: error.message,
            stack: error.stack
        });
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
            const blobClient = getBlobClient(); 

            const payload = await request.json();
            const { fileName, fileData } = payload;

            if (!fileData || !fileData.includes(',')) {
                return createResponse(400, { error: "Invalid file format received." });
            }
            
            const mimeType = fileData.split(';')[0].split(':')[1];
            const base64String = fileData.split(',')[1];
            const buffer = Buffer.from(base64String, 'base64');
            
            const cleanFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const containerClient = blobClient.getContainerClient('equipment-manuals');
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

// --- EMAIL NOTIFICATION ENDPOINT ---
app.http('sendEmail', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const requestBody = await request.json();
            if (!requestBody) {
                return createResponse(400, { error: "Payload missing. Azure received an empty request." });
            }

            const { to, cc, subject, body } = requestBody;

            const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
            if (!connectionString) {
                context.error("Missing Environment Variable: COMMUNICATION_SERVICES_CONNECTION_STRING");
                return createResponse(500, { error: "CRITICAL: COMMUNICATION_SERVICES_CONNECTION_STRING is missing in Azure Environment Variables." });
            }

            const client = new EmailClient(connectionString);

            // Convert plain text line breaks (\n) to HTML line breaks (<br>)
            const htmlBody = body ? body.replace(/\n/g, '<br>') : "<p>You have received an automated operational update.</p>";

            const emailMessage = {
                senderAddress: "DoNotReply@77bb0478-c5db-4ee5-8cf9-84265c1432a3.azurecomm.net",
                content: {
                    subject: subject || "Notification from FI Operations System",
                    plainText: body || "You have received an automated operational update.",
                    html: htmlBody,
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

            if (response.status === "Succeeded") {
                return createResponse(200, { 
                    message: "Email sent successfully via Azure ACS!", 
                    messageId: response.id,
                    status: response.status 
                });
            } else {
                return createResponse(400, { 
                    error: "Azure accepted the payload, but the mail server rejected delivery.", 
                    status: response.status,
                    details: response.error || "No downstream error provided by ACS."
                });
            }
            
        } catch (error) {
            context.error("Email Dispatch Crash:", error);
            return createResponse(500, { 
                error: "Backend execution crash.", 
                name: error.name, 
                details: error.message,
                stack: error.stack
            });
        }
    }
});