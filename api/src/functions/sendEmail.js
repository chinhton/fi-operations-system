const { app } = require('@azure/functions');
const { EmailClient } = require('@azure/communication-email');

app.http('sendEmail', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            // Parse incoming JSON data from your React frontend
            const requestBody = await request.json();
            const { to, subject, body } = requestBody;

            // Load the connection string from Azure Environment Variables
            const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
            
            if (!connectionString) {
                context.log.error("Missing COMMUNICATION_SERVICES_CONNECTION_STRING environment variable.");
                return {
                    status: 500,
                    jsonBody: { error: "Server misconfiguration: Connection string missing." }
                };
            }

            const client = new EmailClient(connectionString);

            // Construct the email payload using your exact provisioned domain
            const emailMessage = {
                senderAddress: "DoNotReply@1f1b4f12-3a18-4366-b454-e99c5d34d5d8.azurecomm.net",
                content: {
                    subject: subject || "Notification from FI Operations System",
                    plainText: body || "You have received an automated operational update.",
                },
                recipients: {
                    to: [{ address: to }],
                },
            };

            // Trigger the email sending sequence
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