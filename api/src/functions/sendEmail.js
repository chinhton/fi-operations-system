const { app } = require('@azure/functions');

// Standardized Response Formatter
const createResponse = (status, data) => ({
    status: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});

const TEAMS_WEBHOOK_URL = "https://default219b57d412c64e939bb9034df55e5a.7d.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/06/workflows/00ae5d02a393435fb76c7dea7d3cb551/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=MYYSeuAlrrqTxDXF5os3v3oG5sbcx5r6YHWBUpJOoDw";

// --- ON-DEMAND TEAMS ALERT ENDPOINT (Hijacking the legacy sendEmail route) ---
app.http('sendEmail', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const requestBody = await request.json();
            if (!requestBody) {
                return createResponse(400, { error: "Payload missing." });
            }

            const { to, subject, body } = requestBody;

            // Format the incoming email payload into a Teams Adaptive Card
            const payload = {
                type: "message",
                attachments: [{
                    contentType: "application/vnd.microsoft.card.adaptive",
                    content: {
                        type: "AdaptiveCard",
                        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                        version: "1.4",
                        body: [
                            { type: "TextBlock", text: `📋 ${subject || "System Notification"}`, weight: "Bolder", size: "Medium", color: "Accent" },
                            { type: "TextBlock", text: body || "Automated operational update.", wrap: true, spacing: "Medium" },
                            { type: "FactSet", facts: [
                                { title: "Assigned To:", value: to || "Unassigned" }
                            ]}
                        ]
                    }
                }]
            };

            // Dispatch to Power Automate Webhook
            const webhookResponse = await fetch(TEAMS_WEBHOOK_URL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });

            if (webhookResponse.ok) {
                return createResponse(200, { success: true, message: "Teams alert routed successfully." });
            } else {
                return createResponse(500, { success: false, error: "Teams server rejected delivery." });
            }
            
        } catch (error) {
            if (context && context.error) context.error("Teams Dispatch Crash:", error);
            return createResponse(500, { success: false, error: "Alert execution bypassed/failed.", details: error.message });
        }
    }
});