const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

// Initializes the Cosmos Client using the secure connection string in Azure
const client = new CosmosClient(process.env.CosmosDbConnectionString || "");
const database = client.database("OmsDatabase");

// Helper function to process Cosmos DB operations safely
async function handleDataRoute(request, containerId) {
    const method = request.method;
    const container = database.container(containerId);

    try {
        if (method === 'GET') {
            const { resources } = await container.items.readAll().fetchAll();
            return { jsonBody: resources };
        }

        if (method === 'POST') {
            const payload = await request.json();
            const { resource } = await container.items.create(payload);
            return { status: 201, jsonBody: resource };
        }
    } catch (error) {
        return {
            status: 500,
            jsonBody: { error: `Cosmos DB error on ${containerId}`, message: error.message }
        };
    }
}

// 🏭 ASSET DIRECTORY ENDPOINT
app.http('assets', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return await handleDataRoute(request, 'assets');
    }
});

// ⚙️ SOP TASK CONFIGURATIONS ENDPOINT
app.http('templates', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return await handleDataRoute(request, 'templates');
    }
});

// 📜 AUDIT LOGS & HISTORY ENDPOINT
app.http('history', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return await handleDataRoute(request, 'history');
    }
});

// 🔑 USER ACCOUNTS ENDPOINT
app.http('users', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return await handleDataRoute(request, 'users');
    }
});