const { app } = require('@azure/functions');
const { EmailClient } = require('@azure/communication-email');

// 1. Explicit Response Formatter (Forces Azure to send the JSON back to the browser)
const createResponse = (status, data) => ({
    status: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});

// 2. Bulletproofed Array Parser
const formatRecipients = (emailInput) => {
    if (!emailInput) return [];
    
    // Force type conversion to string just in case the frontend sends an unexpected object type
    const emailString = String(emailInput); 
    
    return emailString
        .split(',')
        .map(email => ({ address: email.trim() }))
        .filter(obj => obj.address !== ""); // Drop any accidental blank spaces
};

app.http('sendEmail', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            // Check payload existence
            const requestBody = await request.json();
            if (!requestBody) {
                return createResponse(400, { error: "Payload missing. Azure received an empty request." });
            }

            const { to, cc, subject, body } = requestBody;

            // Verify Environment Variable
            const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
            if (!connectionString) {
                return createResponse(500, { error: "CRITICAL: COMMUNICATION_SERVICES_CONNECTION_STRING is missing in Azure Environment Variables." });
            }

            const client = new EmailClient(connectionString);

            const emailMessage = {
                senderAddress: "DoNotReply@77bb0478-c5db-4ee5-8cf9-84265c1432a3.azurecomm.net",
                content: {
                    subject: subject || "Notification from FI Operations System",
                    plainText: body || "You have received an automated operational update.",
                },
                recipients: {
                    to: formatRecipients(to),
                },
            };

            if (cc) {
                emailMessage.recipients.cc = formatRecipients(cc);
            }

            const poller = await client.beginSend(emailMessage);
            const response = await poller.pollUntilDone();

            // Check if Azure ACTUALLY successfully routed it, or if it dropped it.
            if (response.status === "Succeeded") {
                return createResponse(200, { 
                    message: "Email sent successfully via Azure ACS!", 
                    messageId: response.id,
                    status: response.status 
                });
            } else {
                // If it fails here, Azure dropped it due to policy, suppression, or bad domain config.
                return createResponse(400, { 
                    error: "Azure accepted the payload, but the mail server rejected delivery.", 
                    status: response.status,
                    details: response.error || "No downstream error provided by ACS."
                });
            }
            
        } catch (error) {
            // This will capture the exact Node.js crash reason and force it into your Network tab
            return createResponse(500, { 
                error: "Backend execution crash.", 
                name: error.name, 
                details: error.message,
                stack: error.stack
            });
        }
    }
});