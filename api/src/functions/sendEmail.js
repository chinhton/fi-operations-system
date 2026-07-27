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
        .replace(/[\r\n\t]+/g, ' ')        // 1. Destroy all raw newlines/tabs from the frontend code
        .replace(/<\/td>/gi, '   |   ')    // 2. Separate table columns with a clean pipe
        .replace(/<\/tr>/gi, '\n\n')       // 3. Make table rows actual line breaks
        .replace(/<\/p>/gi, '\n\n')        // 4. Make paragraphs line breaks
        .replace(/<br\s*[\/]?>/gi, '\n')   // 5. Convert <br> to actual line breaks
        .replace(/<[^>]+>/g, '')           // 6. Strip all remaining HTML tags out
        .replace(/&nbsp;/gi, ' ')          // 7. Clean up HTML spaces
        .replace(/ {2,}/g, ' ')            // 8. CRITICAL: Collapse multiple spaces into one
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