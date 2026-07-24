const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

// We set this to run at 8:00 AM every single day.
// The NCRONTAB format is: {second} {minute} {hour} {day} {month} {day-of-week}
// Note: You must add an Application Setting in your Azure Portal called "WEBSITE_TIME_ZONE" 
// and set its value to "Pacific Standard Time" for this to fire exactly at 8am PST.
app.timer('dailyMaintenanceSweep', {
    schedule: '0 0 8 * * *', 
    handler: async (myTimer, context) => {
        context.log('Starting automated daily PM sweep...');

        try {
            // 1. Connect directly to your Cosmos DB
            const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
            const database = client.database(process.env.COSMOS_DB_NAME || "fi-oms-db");
            
            // 2. Fetch Assets and PM Templates
            const { resources: assets } = await database.container("Assets").items.readAll().fetchAll();
            const { resources: templates } = await database.container("PmTemplates").items.readAll().fetchAll();

            const dueAssetsList = [];
            const fiveDayWarningList = [];
            const todayStr = new Date().toLocaleDateString('en-US');

            // Date math logic mirrored from the frontend
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

            // 3. Scan the assets to find what is due
            assets.forEach(asset => {
                let isDue = false;
                let dueText = "";
                let lowestDays = null;
                
                if (["Maintenance Due", "Out of Calibration", "Corrective Action", "Overdue"].includes(asset.status)) {
                    isDue = true;
                    dueText = "Immediate Action Required";
                } else {
                    const assetTemplates = templates.filter(t => t.targetCategory === "Global" || t.targetCategory === asset.category);
                    const freqs = [...new Set(assetTemplates.map(t => t.interval))];
                    
                    freqs.forEach(freq => {
                        const targetDateStr = asset.pmDates?.[freq] || asset.lastPmDate;
                        if (targetDateStr === todayStr) return; 

                        const nextDate = calculateNextPmDate(targetDateStr, freq);
                        if (nextDate) {
                            nextDate.setHours(0,0,0,0);
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            const daysLeft = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

                            if (lowestDays === null || daysLeft < lowestDays) {
                                lowestDays = daysLeft;
                            }
                        }
                    });

                    if (lowestDays !== null && lowestDays <= 7) {
                        isDue = true;
                        dueText = lowestDays < 0 ? `Overdue by ${Math.abs(lowestDays)} days` : `Due in ${lowestDays} days`;
                    }
                }

                if (isDue) {
                    dueAssetsList.push(`• **${asset.name}** (S/N: ${asset.serial || 'N/A'}) - ${dueText}`);
                }

                if (lowestDays === 5) {
                    fiveDayWarningList.push(`• **${asset.name}** (S/N: ${asset.serial || 'N/A'}) - Assigned to: ${asset.operatorEmail || 'Unassigned'}`);
                }
            });

            // 4. Fire Webhooks to Teams
            const TEAMS_WEBHOOK_URL = "https://default219b57d412c64e939bb9034df55e5a.7d.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/06/workflows/00ae5d02a393435fb76c7dea7d3cb551/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=MYYSeuAlrrqTxDXF5os3v3oG5sbcx5r6YHWBUpJOoDw";

            const sendTeamsAlert = async (subject, bodyText) => {
                const payload = {
                    type: "message",
                    attachments: [{
                        contentType: "application/vnd.microsoft.card.adaptive",
                        content: {
                            type: "AdaptiveCard",
                            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                            version: "1.4",
                            body: [
                                { type: "TextBlock", text: `🚨 ${subject}`, weight: "Bolder", size: "Medium", color: "Accent" },
                                { type: "TextBlock", text: bodyText, wrap: true, spacing: "Medium" }
                            ]
                        }
                    }]
                };
                await fetch(TEAMS_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            };

            if (dueAssetsList.length > 0) {
                const messageBody = `Hello Team! Below is a list of upcoming action items due within 7 days:\n\n${dueAssetsList.join('\n\n')}\n\nPlease log into the FI-Operations Management System to review and assign these tasks.`;
                await sendTeamsAlert(`📅 Daily Maintenance Brief: ${dueAssetsList.length} Action(s) Required`, messageBody);
            }

            if (fiveDayWarningList.length > 0) {
                const warningBody = `⚠️ **5-DAY ADVANCED WARNING** ⚠️\n\nThe following systems have maintenance due in exactly 5 days. Please ensure any required parts are ordered and vendors are scheduled:\n\n${fiveDayWarningList.join('\n\n')}`;
                await sendTeamsAlert(`⏳ 5-Day PM Warning: Action Approaching`, warningBody);
            }

            context.log('Daily PM sweep completed successfully.');

        } catch (error) {
            context.log.error('Failed to run daily PM sweep:', error);
        }
    }
});