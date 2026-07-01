const { app } = require('@azure/functions');
const { EmailClient } = require('@azure/communication-email');

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
                senderAddress: "DoNotReply@c805663a-e99f-4e65-9825-9a3d620107cb.azurecomm.net",
                content: {
                    subject: subject || "Notification from FI Operations System",
                    plainText: body || "You have received an automated operational update.",
                },
                recipients: {
                    to: [{ address: to }],
                },
            };

            if (cc) {
                emailMessage.recipients.cc = [{ address: cc }];
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