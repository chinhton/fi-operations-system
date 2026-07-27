const { app } = require('@azure/functions');
const { sendTeamsMessage } = require('./teamsService'); 

const createResponse = (status, data) => ({
    status: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});

// Helper to convert Legacy HTML payloads into clean text for Teams
const formatHtmlForTeams = (htmlStr) => {
    if (!htmlStr) return "Automated operational update.";
    return htmlStr
        .replace(/<\/td>/gi, '   ')        // Add spacing after table columns
        .replace(/<\/tr>/gi, '\n\n')       // Add line breaks after table rows
        .replace(/<\/p>/gi, '\n\n')        // Add line breaks after paragraphs
        .replace(/<br\s*[\/]?>/gi, '\n')   // Convert <br> to actual line breaks
        .replace(/<[^>]+>/g, '')           // Strip all remaining HTML tags out
        .replace(/&nbsp;/gi, ' ')          // Clean up HTML spaces
        .trim();
};

app.http('sendEmail', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const requestBody = await request.json();
            if (!requestBody) return createResponse(400, { error: "Payload missing." });

            const { to, subject, body } = requestBody;

            // Clean the legacy HTML body before sending to Teams
            const cleanBodyText = formatHtmlForTeams(body);

            // Use the centralized service to fire the message
            const success = await sendTeamsMessage(
                subject || "System Notification", 
                cleanBodyText, 
                to,       
                "Good"    
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