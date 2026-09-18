const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');
const { sendTeamsMessage } = require('./teamsService');

const runDailySweep = async () => {
        try {
            const cosmosConn = process.env.CosmosDbConnectionString || process.env.COSMOS_CONNECTION_STRING;
            if (!cosmosConn) {
                return { status: 500, body: "Bypassed: Missing Cosmos DB connection string." };
            }

            const dbClient = new CosmosClient(cosmosConn);
            const database = dbClient.database(process.env.COSMOS_DB_NAME || "OmsDatabase");
            
            const { resources: workOrders } = await database.container("workorders").items.query("SELECT * FROM c WHERE c.status != 'Completed'").fetchAll();
            const { resources: assets } = await database.container("assets").items.readAll().fetchAll();

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // --- THE FIX: Group by Operator Email ---
            const userDigests = {};

            const categorizeItem = (itemName, itemId, targetDate, isCriticalStatus, assignedToEmail) => {
                let diffDays;
                if (isCriticalStatus) {
                    diffDays = -1; 
                } else {
                    targetDate.setHours(0, 0, 0, 0);
                    diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                }

                // Determine target email (fallback to admin)
                const email = (assignedToEmail && assignedToEmail !== 'Unassigned') ? assignedToEmail : 'admin@fcimg.com';

                // Initialize their bucket if it doesn't exist yet
                if (!userDigests[email]) {
                    userDigests[email] = { critical: [], dueToday: [], upcoming: [] };
                }

                const itemString = `• **${itemName}** (S/N: ${itemId})`;

                if (diffDays < 0) {
                    userDigests[email].critical.push(`${itemString} *(Overdue by ${Math.abs(diffDays)} days)*`);
                } else if (diffDays === 0) {
                    userDigests[email].dueToday.push(itemString);
                } else if (diffDays === 5) {
                    userDigests[email].upcoming.push(itemString);
                }
            };

            for (const wo of workOrders) {
                if (wo.dueDate && wo.remindersEnabled !== false) {
                    categorizeItem(wo.title || wo.name || 'Maintenance Task', wo.id, new Date(wo.dueDate), false, wo.assignedTo);
                }
            }

            // SOPs no longer carry a schedule/category, so asset-side reminders are driven purely
            // by directly-flagged critical status; scheduled reminders come from work-order due dates above.
            for (const asset of assets) {
                const isCriticalStatus = ["Maintenance Due", "Out of Calibration", "Corrective Action", "Overdue"].includes(asset.status);
                if (isCriticalStatus) {
                    categorizeItem(asset.name, asset.serial || asset.id, new Date(), true, asset.operatorEmail);
                }
            }

            // --- THE FIX: Send personalized messages per operator ---
            let sentCount = 0;
            
            for (const [email, lists] of Object.entries(userDigests)) {
                if (lists.critical.length > 0) {
                    await sendTeamsMessage(`CRITICAL: ${lists.critical.length} Overdue Action(s)`, `The following systems assigned to you are overdue and require immediate compliance action:\n\n${lists.critical.join('\n\n')}`, email, "Attention");
                    sentCount++;
                }
                if (lists.dueToday.length > 0) {
                    await sendTeamsMessage(`DUE TODAY: ${lists.dueToday.length} Action(s)`, `The following routine maintenance actions assigned to you must be completed today:\n\n${lists.dueToday.join('\n\n')}`, email, "Warning");
                    sentCount++;
                }
                if (lists.upcoming.length > 0) {
                    await sendTeamsMessage(`UPCOMING: ${lists.upcoming.length} Action(s) Due in 5 Days`, `Advanced warning for systems assigned to you. Please ensure any required parts are ordered:\n\n${lists.upcoming.join('\n\n')}`, email, "Accent");
                    sentCount++;
                }
            }

            return { status: 200, body: `Sweep completed. ${sentCount} personalized digest(s) pushed to Teams.` };

        } catch (error) {
            return { status: 500, body: `Error running sweep: ${error.message}` };
        }
};

app.timer('dailySweep', {
    schedule: '0 0 13 * * *', // Daily at 13:00 UTC
    handler: async (timer, context) => {
        const result = await runDailySweep();
        context.log(result.body);
    }
});

// Manual/on-demand trigger for testing without waiting on the schedule
app.http('dailySweepManual', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => runDailySweep()
});