const TEAMS_WEBHOOK_URL = "https://default219b57d412c64e939bb9034df55e5a.7d.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/06/workflows/00ae5d02a393435fb76c7dea7d3cb551/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=MYYSeuAlrrqTxDXF5os3v3oG5sbcx5r6YHWBUpJOoDw";

const sendTeamsMessage = async (subject, bodyText, assignedTo = null, colorTheme = "Accent") => {
    // Only add the FactSet if there's an assignee
    const facts = assignedTo ? [{ title: "Assigned To:", value: assignedTo }] : [];

    const payload = {
        type: "message",
        attachments: [{
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
                type: "AdaptiveCard",
                $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                version: "1.4",
                body: [
                    { type: "TextBlock", text: `🚨 ${subject}`, weight: "Bolder", size: "Medium", color: colorTheme },
                    { type: "TextBlock", text: bodyText, wrap: true, spacing: "Medium" },
                    ...(facts.length > 0 ? [{ type: "FactSet", facts: facts }] : [])
                ]
            }
        }]
    };

    const response = await fetch(TEAMS_WEBHOOK_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
    });

    return response.ok;
};

module.exports = { sendTeamsMessage };