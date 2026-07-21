const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');
const { EmailClient } = require('@azure/communication-email');

app.timer('dailyPmReminders', {
    schedule: '0 0 8 * * *', 
    handler: async (myTimer, context) => {
        try {
            const cosmosConn = process.env.CosmosDbConnectionString;
            const emailConn = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;

            if (!cosmosConn || !emailConn) {
                context.log("CRITICAL: Missing DB or Email connection strings.");
                return;
            }

            const dbClient = new CosmosClient(cosmosConn);
            const container = dbClient.database("OmsDatabase").container("workorders");

            // Fetch all active work orders (Anything not completed)
            const { resources: activeOrders } = await container.items
                .query("SELECT * FROM c WHERE c.status != 'Completed'")
                .fetchAll();

            if (activeOrders.length === 0) {
                context.log("No active PMs found. Facility is 100% compliant.");
                return;
            }

            const emailClient = new EmailClient(emailConn);
            const senderAddress = "DoNotReply@77bb0478-c5db-4ee5-8cf9-84265c1432a3.azurecomm.net"; 

            const today = new Date();
            today.setHours(0, 0, 0, 0); 
            
            for (const wo of activeOrders) {
                // Ensure this matches your database property for the due date
                if (!wo.dueDate) continue; 

                const taskDate = new Date(wo.dueDate);
                taskDate.setHours(0, 0, 0, 0);

                // Calculate the exact difference in days
                const diffTime = taskDate.getTime() - today.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                let statusText = "";
                let badgeColor = "";
                let shouldSend = false;

                // 1. Relentless Daily Spam for Overdue
                if (diffDays < 0) {
                    statusText = `OVERDUE BY ${Math.abs(diffDays)} DAYS`;
                    badgeColor = "#ef4444"; // Urgent Red
                    shouldSend = true;
                } 
                // 2. Day-Of Reminder
                else if (diffDays === 0) {
                    statusText = "DUE TODAY";
                    badgeColor = "#f97316"; // Warning Orange
                    shouldSend = true;
                } 
                // 3. 7-Day Heads Up
                else if (diffDays === 7) {
                    statusText = "DUE IN 7 DAYS";
                    badgeColor = "#3b82f6"; // Standard Blue
                    shouldSend = true;
                }

                if (shouldSend) {
                    const targetEmail = wo.operatorEmail || wo.managerEmail; 

                    if (!targetEmail) continue;

                    const emailMessage = {
                        senderAddress: senderAddress,
                        content: {
                            subject: `[Action Required] PM Task ${statusText}: ${wo.name || wo.title || 'Maintenance Task'}`,
                            html: `
                                <div style="font-family: Arial, sans-serif; color: #1A2530; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; border-top: 5px solid ${badgeColor};">
                                    <h2 style="color: ${badgeColor}; margin-top: 0;">Task ${statusText}</h2>
                                    <p>The following preventive maintenance task requires your attention to maintain facility compliance.</p>
                                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                        <tr>
                                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold;">Task Name:</td>
                                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7;">${wo.name || wo.title}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold;">Task ID:</td>
                                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7;">${wo.id}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold;">Target Date:</td>
                                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold;">${taskDate.toLocaleDateString()}</td>
                                        </tr>
                                    </table>
                                    <p style="margin-top: 20px; font-size: 12px; color: #718096;">Please log into the Fairchild Operations Management System to execute this assignment.</p>
                                </div>
                            `
                        },
                        recipients: {
                            to: [{ address: targetEmail }]
                        }
                    };

                    await emailClient.beginSend(emailMessage);
                    context.log(`Automated reminder (${statusText}) sent for task ${wo.id} to ${targetEmail}`);
                }
            }

        } catch (error) {
            context.log("Failed to process daily PM reminders:", error);
        }
    }
});