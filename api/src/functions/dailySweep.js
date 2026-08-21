const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');
const { sendTeamsMessage } = require('./teamsService'); 

app.http('dailySweep', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const cosmosConn = process.env.CosmosDbConnectionString || process.env.COSMOS_CONNECTION_STRING;
            if (!cosmosConn) {
                return { status: 500, body: "Bypassed: Missing Cosmos DB connection string." };
            }

            const dbClient = new CosmosClient(cosmosConn);
            const database = dbClient.database(process.env.COSMOS_DB_NAME || "OmsDatabase");
            
            const { resources: workOrders } = await database.container("workorders").items.query("SELECT * FROM c WHERE c.status != 'Completed'").fetchAll();
            const { resources: assets } = await database.container("assets").items.readAll().fetchAll();
            const { resources: templates } = await database.container("templates").items.readAll().fetchAll();

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toLocaleDateString('en-US');

            // --- THE FIX: Group by Operator Email ---
            const userDigests = {}; 

            const calculateNextPmDate = (lastDateStr, freq) => {
                if (!lastDateStr || !freq) return null;
                const lastDate = new Date(lastDateStr);
                let nextDate = new Date(lastDate);

                switch (freq) {
                    case "Daily": nextDate.setDate(lastDate.getDate() + 1); break;
                    case "Weekly": nextDate.setDate(lastDate.getDate() + 7); break;
                    case "Monthly": nextDate.setMonth(lastDate.getMonth() + 1); break;
                    case "Quarterly": nextDate.setMonth(lastDate.getMonth() + 3); break;
                    case "Semi-Annually":
                    case "Calibration (Semi-Annual)": nextDate.setMonth(lastDate.getMonth() + 6); break;
                    case "Annually":
                    case "Calibration (Annual)": nextDate.setFullYear(lastDate.getFullYear() + 1); break;
                    case "2-Year": nextDate.setFullYear(lastDate.getFullYear() + 2); break;
                    case "3-Year": nextDate.setFullYear(lastDate.getFullYear() + 3); break;
                    case "4-Year": nextDate.setFullYear(lastDate.getFullYear() + 4); break;
                    case "5-Year": nextDate.setFullYear(lastDate.getFullYear() + 5); break;
                    default: return null;
                }
                return nextDate;
            };

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
                if (wo.dueDate) {
                    categorizeItem(wo.title || wo.name || 'Maintenance Task', wo.id, new Date(wo.dueDate), false, wo.operatorEmail || wo.managerEmail);
                }
            }

            for (const asset of assets) {
                const isCriticalStatus = ["Maintenance Due", "Out of Calibration", "Corrective Action", "Overdue"].includes(asset.status);
                const assetTemplates = templates.filter(t => t.targetCategory === "Global" || t.targetCategory === asset.category);
                const freqs = [...new Set(assetTemplates.map(t => t.interval))];

                let nextActionDate = null;
                freqs.forEach(freq => {
                    const explicitLastDone = asset.pmDates?.[freq];
                    if (explicitLastDone === todayStr) return; 

                    const baselineDate = explicitLastDone || asset.lastPmDate || todayStr;
                    const calculatedNextDate = calculateNextPmDate(baselineDate, freq);
                    
                    if (calculatedNextDate && (nextActionDate === null || calculatedNextDate < nextActionDate)) {
                        nextActionDate = calculatedNextDate;
                    }
                });

                if (isCriticalStatus || nextActionDate !== null) {
                    categorizeItem(asset.name, asset.serial || asset.id, nextActionDate || new Date(), isCriticalStatus, asset.operatorEmail);
                }
            }

            // --- THE FIX: Send personalized messages per operator ---
            let sentCount = 0;
            
            for (const [email, lists] of Object.entries(userDigests)) {
                if (lists.critical.length > 0) {
                    await sendTeamsMessage(email, `CRITICAL: ${lists.critical.length} Overdue Action(s)`, `The following systems assigned to you are overdue and require immediate compliance action:\n\n${lists.critical.join('\n\n')}`);
                    sentCount++;
                }
                if (lists.dueToday.length > 0) {
                    await sendTeamsMessage(email, `DUE TODAY: ${lists.dueToday.length} Action(s)`, `The following routine maintenance actions assigned to you must be completed today:\n\n${lists.dueToday.join('\n\n')}`);
                    sentCount++;
                }
                if (lists.upcoming.length > 0) {
                    await sendTeamsMessage(email, `UPCOMING: ${lists.upcoming.length} Action(s) Due in 5 Days`, `Advanced warning for systems assigned to you. Please ensure any required parts are ordered:\n\n${lists.upcoming.join('\n\n')}`);
                    sentCount++;
                }
            }

            return { status: 200, body: `Sweep completed. ${sentCount} personalized digest(s) pushed to Teams.` };

        } catch (error) {
            return { status: 500, body: `Error running sweep: ${error.message}` };
        }
    }
});