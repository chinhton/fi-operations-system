const { app } = require('@azure/functions');
const { EmailClient } = require('@azure/communication-email');

// Helper function to safely split comma-separated strings into Azure's required format
const formatRecipients = (emailString) => {
    if (!emailString) return [];
    return emailString
        .split(',')
        .map(email => ({ address: email.trim() }))
        .filter(obj => obj.address !== ""); // drop any accidental blanks
};

app.http('sendEmail', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const requestBody = await request.json();
            const { to, cc, subject, body } = requestBody;

            const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
            
            if (!connectionString) {
                context.log.error("Missing COMMUNICATION_SERVICES_CONNECTION_STRING environment variable.");
                return {
                    status: 500,
                    jsonBody: { error: "Server misconfiguration: Connection string missing." }
                };
            }

            const client = new EmailClient(connectionString);

            const emailMessage = {
                senderAddress: "DoNotReply@77bb0478-c5db-4ee5-8cf9-84265c1432a3.azurecomm.net",
                content: {
                    subject: subject || "Notification from FI Operations System",
                    plainText: body || "You have received an automated operational update.",
                },
                recipients: {
                    // Use the helper to properly format the 'to' string
                    to: formatRecipients(to),
                },
            };

            // Use the helper to properly format the 'cc' string if it exists
            if (cc) {
                emailMessage.recipients.cc = formatRecipients(cc);
            }

            const poller = await client.beginSend(emailMessage);
            const response = await poller.pollUntilDone();

            context.log(`Email dispatched successfully. Message ID: ${response.id}`);

            return { 
                status: 200, 
                jsonBody: { message: "Email sent successfully via Azure ACS!", messageId: response.id } 
            };
        } catch (error) {
            context.log.error("Failed to send email via Azure:", error);
            return { 
                status: 500, 
                jsonBody: { error: "Failed to send email backend-side.", details: error.message } 
            };
        }
    }
});