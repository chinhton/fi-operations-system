const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

app.timer('dailyPmSweepTeams', {
    schedule: '0 */2 * * * *', // 15:00 UTC = 8:00 AM Pacific Time
    handler: async (myTimer, context) => {
        try {
            const cosmosConn = process.env.CosmosDbConnectionString || process.env.COSMOS_CONNECTION_STRING;
            if (!cosmosConn) {
                context.log("Bypassed: Missing Cosmos DB connection string.");
                return;
            }

            const dbClient = new CosmosClient(cosmosConn);
            // Defaulting to OmsDatabase, adjust if your DB name is different
            const database = dbClient.database(process.env.COSMOS_DB_NAME || "OmsDatabase");
            
            const { resources: workOrders } = await database.container("workorders").items.query("SELECT * FROM c WHERE c.status != 'Completed'").fetchAll();
            const { resources: assets } = await database.container("Assets").items.readAll().fetchAll();
            const { resources: templates } = await database.container("PmTemplates").items.readAll().fetchAll();

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toLocaleDateString('en-US');

            // --- NOTIFICATION BUCKETS ---
            const criticalList = [];
            const dueTodayList = [];
            const upcomingList = [];

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

            const categorizeItem = (itemName, itemId, targetDate, isCriticalStatus, assignedTo) => {
                let diffDays;
                if (isCriticalStatus) {
                    diffDays = -1; // Force critical logic
                } else {
                    targetDate.setHours(0, 0, 0, 0);
                    diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                }

                const assignee = assignedTo || 'Unassigned';
                const itemString = `• **${itemName}** (S/N: ${itemId}) - OP: ${assignee}`;

                if (diffDays < 0) {
                    criticalList.push(`${itemString} *(Overdue by ${Math.abs(diffDays)} days)*`);
                } else if (diffDays === 0) {
                    dueTodayList.push(itemString);
                } else if (diffDays === 5) {
                    upcomingList.push(itemString);
                }
            };

            // 1. Process Standalone Work Orders
            for (const wo of workOrders) {
                if (wo.dueDate) {
                    categorizeItem(wo.title || wo.name || 'Maintenance Task', wo.id, new Date(wo.dueDate), false, wo.operatorEmail || wo.managerEmail);
                }
            }

            // 2. Process Facility Assets
            for (const asset of assets) {
                const isCriticalStatus = ["Maintenance Due", "Out of Calibration", "Corrective Action", "Overdue"].includes(asset.status);
                const assetTemplates = templates.filter(t => t.targetCategory === "Global" || t.targetCategory === asset.category);
                const freqs = [...new Set(assetTemplates.map(t => t.interval))];

                let nextActionDate = null;
                freqs.forEach(freq => {
                    const explicitLastDone = asset.pmDates?.[freq];
                    if (explicitLastDone === todayStr) return; // Zero-Inbox shield

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

            // 3. Dispatch to Teams via Webhook
            const TEAMS_WEBHOOK_URL = "https://default219b57d412c64e939bb9034df55e5a.7d.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/06/workflows/00ae5d02a393435fb76c7dea7d3cb551/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=MYYSeuAlrrqTxDXF5os3v3oG5sbcx5r6YHWBUpJOoDw";

            const sendTeamsAlert = async (subject, bodyText, colorTheme) => {
                const payload = {
                    type: "message",
                    attachments: [{
                        contentType: "application/vnd.microsoft.card.adaptive",
                        content: {
                            type: "AdaptiveCard",
                            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                            version: "1.4",
                            body: [
                                { type: "TextBlock", text: `🚨 ${subject}`, weight: "Bolder", size: "Medium", color: colorTheme },
                                { type: "TextBlock", text: bodyText, wrap: true, spacing: "Medium" }
                            ]
                        }
                    }]
                };
                await fetch(TEAMS_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            };

            // Fire grouped alerts if buckets have data
            if (criticalList.length > 0) {
                await sendTeamsAlert(
                    `CRITICAL: ${criticalList.length} Overdue Action(s)`, 
                    `The following systems are overdue and require immediate compliance action:\n\n${criticalList.join('\n\n')}`, 
                    "Attention" // Renders Red in Teams
                );
            }
            if (dueTodayList.length > 0) {
                await sendTeamsAlert(
                    `DUE TODAY: ${dueTodayList.length} Action(s)`, 
                    `The following routine maintenance actions must be completed today:\n\n${dueTodayList.join('\n\n')}`, 
                    "Warning" // Renders Yellow/Orange in Teams
                );
            }
            if (upcomingList.length > 0) {
                await sendTeamsAlert(
                    `UPCOMING: ${upcomingList.length} Action(s) Due in 5 Days`, 
                    `Advanced warning for the following systems. Please ensure any required parts are ordered and external vendors are scheduled:\n\n${upcomingList.join('\n\n')}`, 
                    "Accent" // Renders Blue in Teams
                );
            }

            context.log("Daily PM Teams sweep completed successfully.");

        } catch (error) {
            context.log.error("Failed to run daily PM Teams sweep:", error);
        }
    }
});