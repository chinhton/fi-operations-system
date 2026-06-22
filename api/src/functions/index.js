const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

// Fallback gracefully if connection string is updating in the portal settings
const connectionString = process.env.CosmosDbConnectionString || "";
const client = new CosmosClient(connectionString);
const database = client.database("OmsDatabase");

// Universal Error/Response Formatter Helper
const createResponse = (status, body) => ({
    status: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

// 🏭 HARDWARE ASSET INTERFACE DEFINITION
app.http('assets', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const container = database.container('assets');
        try {
            if (request.method === 'GET') {
                const { resources } = await container.items.readAll().fetchAll();
                return createResponse(200, resources);
            }
            if (request.method === 'POST') {
                const payload = await request.json();
                const { resource } = await container.items.create(payload);
                return createResponse(201, resource);
            }
        } catch (error) {
            return createResponse(500, { error: "Assets container action failure", details: error.message });
        }
    }
});

// ⚙️ SOP TASK LAYOUT CONFIGURATOR INTERFACE
app.http('templates', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const container = database.container('templates');
        try {
            if (request.method === 'GET') {
                const { resources } = await container.items.readAll().fetchAll();
                return createResponse(200, resources);
            }
            if (request.method === 'POST') {
                const payload = await request.json();
                const { resource } = await container.items.create(payload);
                return createResponse(201, resource);
            }
        } catch (error) {
            return createResponse(500, { error: "Templates container action failure", details: error.message });
        }
    }
});

// 📜 AUDIT TRAIL RECORD STACK INTERFACE
app.http('history', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const container = database.container('history');
        try {
            if (request.method === 'GET') {
                const { resources } = await container.items.readAll().fetchAll();
                return createResponse(200, resources);
            }
            if (request.method === 'POST') {
                const payload = await request.json();
                const { resource } = await container.items.create(payload);
                return createResponse(201, resource);
            }
        } catch (error) {
            return createResponse(500, { error: "History container action failure", details: error.message });
        }
    }
});

// 🔑 PROVISIONED USER ACCESS ROSTER INTERFACE
app.http('users', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const container = database.container('users');
        try {
            if (request.method === 'GET') {
                const { resources } = await container.items.readAll().fetchAll();
                return createResponse(200, resources);
            }
            if (request.method === 'POST') {
                const payload = await request.json();
                const { resource } = await container.items.create(payload);
                return createResponse(201, resource);
            }
        } catch (error) {
            return createResponse(500, { error: "Users container action failure", details: error.message });
        }
    }
});