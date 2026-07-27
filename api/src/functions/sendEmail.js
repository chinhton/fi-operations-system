const { app } = require('@azure/functions');
const { sendTeamsMessage } = require('./teamsService'); // <-- Importing your central file

const createResponse = (status, data) => ({
    status: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});

app.http('sendEmail', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const requestBody = await request.json();
            if (!requestBody) return createResponse(400, { error: "Payload missing." });

            const { to, subject, body } = requestBody;

            // Use your centralized service to fire the message
            const success = await sendTeamsMessage(
                subject || "System Notification", 
                body || "Automated operational update.", 
                to,       // Passes the assigned email
                "Good"    // Green header for new PMs
            );

            if (success) {
                return createResponse(200, { success: true, message: "Teams alert routed successfully." });
            } else {
                return createResponse(500, { success: false, error: "Teams server rejected delivery." });
            }
            
        } catch (error) {
            return createResponse(500, { success: false, error: "Alert execution failed.", details: error.message });
        }
    }
});