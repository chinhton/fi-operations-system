const { app } = require('@azure/functions');
const { EmailClient } = require('@azure/communication-email');

// Standardized Response Formatter
const createResponse = (status, data) => ({
    status: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});

// Helper for Email Recipients
const formatRecipients = (emailInput) => {
    if (!emailInput) return [];
    const emailString = String(emailInput); 
    return emailString
        .split(',')
        .map(email => ({ address: email.trim() }))
        .filter(obj => obj.address !== ""); 
};

// --- ON-DEMAND HTTP EMAIL ENDPOINT (Alerts/Approvals) ---
app.http('sendEmail', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const requestBody = await request.json();
            if (!requestBody) {
                return createResponse(400, { error: "Payload missing." });
            }

            const { to, cc, subject, body } = requestBody;
            const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
            
            if (!connectionString) {
                if (context && context.warn) context.warn("Bypassed: COMMUNICATION_SERVICES_CONNECTION_STRING missing.");
                return createResponse(200, { success: false, error: "Email bypassed: ACS Connection String missing." });
            }

            const client = new EmailClient(connectionString);
            const htmlBody = body ? body.replace(/\n/g, '<br>') : "<p>Automated operational update.</p>";

            const emailMessage = {
                senderAddress: "DoNotReply@77bb0478-c5db-4ee5-8cf9-84265c1432a3.azurecomm.net",
                content: {
                    subject: subject || "Notification from FI Operations System",
                    plainText: body || "Automated operational update.",
                    html: htmlBody,
                },
                recipients: { to: formatRecipients(to) },
            };

            if (cc) emailMessage.recipients.cc = formatRecipients(cc);

            const poller = await client.beginSend(emailMessage);
            const response = await poller.pollUntilDone();

            if (response.status === "Succeeded") {
                return createResponse(200, { success: true, messageId: response.id });
            } else {
                return createResponse(200, { success: false, error: "Mail server rejected delivery.", details: response.error });
            }
            
        } catch (error) {
            if (context && context.error) context.error("Email Dispatch Crash:", error);
            return createResponse(200, { success: false, error: "Email execution bypassed/failed.", details: error.message });
        }
    }
});