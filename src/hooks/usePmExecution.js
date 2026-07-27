import { useState } from 'react';

export default function usePmExecution(assets, setAssets, history, setHistory, currentUser, triggerModal) {
  const [isPmModalOpen, setIsPmModalOpen] = useState(false);
  const [selectedPmAsset, setSelectedPmAsset] = useState(null);
  const [selectedPmTemplate, setSelectedPmTemplate] = useState("");
  const [pmAnswers, setPmAnswers] = useState({});
  const [pmComments, setPmComments] = useState("");
  const [pmStatusState, setPmStatusState] = useState("Operational");
  const [isSubmittingPm, setIsSubmittingPm] = useState(false);

  const openPmModal = (asset) => {
    setSelectedPmAsset(asset);
    setSelectedPmTemplate("");
    setPmAnswers({});
    setPmComments("");
    setPmStatusState("Operational");
    setIsPmModalOpen(true);
  };

  const closePmModal = () => {
    setIsPmModalOpen(false);
    setSelectedPmAsset(null);
  };

  const handlePmSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPmTemplate) { triggerModal("Error", "Please select a PM Protocol SOP.", "info"); return; }
    setIsSubmittingPm(true);

    try {
      const updatedAsset = { ...selectedPmAsset };
      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const exactTimestamp = new Date().toLocaleString('en-US');
      
      if (!updatedAsset.pmDates) updatedAsset.pmDates = {};
      updatedAsset.pmDates[selectedPmTemplate.interval] = todayStr;
      updatedAsset.status = pmStatusState;

      // --- COSMOS DB CONNECTION ---
      await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) });

      const historyPayload = {
        id: `AUDIT-${Date.now().toString().slice(-4)}`,
        assetId: selectedPmAsset.id, 
        assetName: selectedPmAsset.name, 
        assetSerial: selectedPmAsset.serial,
        templateName: selectedPmTemplate.name, 
        interval: selectedPmTemplate.interval,
        technician: currentUser?.name || "System Operator",
        email: currentUser?.email || "",
        timestamp: exactTimestamp, 
        status: pmStatusState, 
        comments: pmComments, 
        responses: pmAnswers 
      };
      
      await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(historyPayload) });

      // --- TEAMS WEBHOOK CONNECTION (Replacing Email) ---
      const TEAMS_WEBHOOK_URL = "https://default219b57d412c64e939bb9034df55e5a.7d.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/06/workflows/00ae5d02a393435fb76c7dea7d3cb551/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=MYYSeuAlrrqTxDXF5os3v3oG5sbcx5r6YHWBUpJOoDw";
      
      const teamsPayload = {
          type: "message",
          attachments: [{
              contentType: "application/vnd.microsoft.card.adaptive",
              content: {
                  type: "AdaptiveCard",
                  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                  version: "1.4",
                  body: [
                      { type: "TextBlock", text: `✅ PM Executed: ${selectedPmAsset.name}`, weight: "Bolder", size: "Medium", color: "Good" },
                      { 
                        type: "TextBlock", 
                        text: `**Protocol:** ${selectedPmTemplate.name}\n**Cycle:** ${selectedPmTemplate.interval}\n**Executed By:** ${currentUser?.name}\n**Final Status:** ${pmStatusState}\n\n**Notes:** ${pmComments || 'No additional notes provided.'}`, 
                        wrap: true 
                      }
                  ]
              }
          }]
      };

      // Fire and forget - we don't need to await this and block the UI closing
      fetch(TEAMS_WEBHOOK_URL, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(teamsPayload) 
      }).catch(err => console.error("Teams notification failed:", err));

      setAssets(assets.map(a => a.id === selectedPmAsset.id ? updatedAsset : a));
      setHistory([historyPayload, ...history]);
      triggerModal("Protocol Logged", "Preventative Maintenance successfully recorded.", "success");
      closePmModal();
      
    } catch (err) { 
        triggerModal("Database Error", "Failed to commit PM action.", "error"); 
    } finally { 
        setIsSubmittingPm(false); 
    }
  };

  return { isPmModalOpen, selectedPmAsset, selectedPmTemplate, setSelectedPmTemplate, pmAnswers, setPmAnswers, pmStatusState, setPmStatusState, pmComments, setPmComments, isSubmittingPm, openPmModal, closePmModal, handlePmSubmit };
}