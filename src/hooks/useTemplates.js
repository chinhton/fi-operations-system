import { useState } from 'react';

export default function useTemplates(triggerModal, closeModal, pmTemplates, setPmTemplates) {
  const [newTemplate, setNewTemplate] = useState({ name: "", interval: "Monthly", department: "", targetCategory: "Global", managerEmail: "", operatorEmail: "", checklistSteps: [] });
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);

  const handleTemplateManualUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTemplate({ 
          ...newTemplate, 
          attachedManualName: file.name,
          attachedManualData: reader.result 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTemplateSubmit = async (e) => {
    e.preventDefault();
    if (isAddingTemplate) return;
    
    if (!newTemplate.name) { triggerModal("Error", "SOP Template Title is strictly required.", "info"); return; }
    if (!newTemplate.checklistSteps || newTemplate.checklistSteps.length === 0) {
      triggerModal("Error", "Please add at least one dynamic action step.", "info"); return;
    }

    setIsAddingTemplate(true);
    try {
      const payload = {
        id: editingTemplateId || `SOP-${Date.now().toString().slice(-3)}`,
        name: newTemplate.name.trim(),
        interval: newTemplate.interval,
        department: newTemplate.department.trim() || "General Engineering",
        targetCategory: newTemplate.targetCategory,
        managerEmail: newTemplate.managerEmail || "",
        operatorEmail: newTemplate.operatorEmail || "",
        checklist: newTemplate.checklistSteps,
        attachedManualName: newTemplate.attachedManualName || null,
        attachedManualData: newTemplate.attachedManualData || null
      };

      const res = await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      
      if (res.ok) {
        const savedTemplate = await res.json();
        if (editingTemplateId) {
          setPmTemplates(pmTemplates.map(t => t.id === editingTemplateId ? savedTemplate : t));
          triggerModal("Standard Updated", "Preventative maintenance guideline profile updated.", "success");
        } else {
          setPmTemplates([...pmTemplates, savedTemplate]);
          triggerModal("Standard Created", "New preventative maintenance guideline profile cataloged.", "success");
        }

        // --- TRIGGER NOTIFICATION VIA EXISTING sendEmail.js ---
        if (payload.managerEmail || payload.operatorEmail) {
            const recipients = [payload.managerEmail, payload.operatorEmail].filter(Boolean).join(',');

            const emailBody = `
                <div style="font-family: Arial, sans-serif; color: #1A2530; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #005596; margin-top: 0;">New Preventive Maintenance Task Assigned</h2>
                    <p>A new maintenance protocol has been generated and queued for facility execution.</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold;">Task Name:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7;">${payload.name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold;">Interval Frequency:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7;">${payload.interval}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold;">Responsible Department:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7;">${payload.department}</td>
                        </tr>
                    </table>
                    <p style="margin-top: 20px; font-size: 12px; color: #718096;">Please log into the Fairchild Operations Management System to complete your assignment.</p>
                </div>
            `;

            fetch('/api/sendEmail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: recipients,
                    subject: `[PM Assignment] New Protocol: ${payload.name}`,
                    body: emailBody
                })
            }).catch(err => console.error("Email API trigger failed:", err));
        }
        // -------------------------------------------------------

        setNewTemplate({ name: "", interval: "Monthly", department: "", targetCategory: "Global", managerEmail: "", operatorEmail: "", checklistSteps: [] });
        setEditingTemplateId(null);
      }
    } finally { setIsAddingTemplate(false); }
  };

  const handleEditTemplateClick = (template) => {
    const mappedSteps = template.checklist.map(item => typeof item === 'string' ? { type: 'checkbox', label: item } : item);
    setNewTemplate({ ...template, checklistSteps: mappedSteps });
    setEditingTemplateId(template.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditTemplate = () => {
    setNewTemplate({ name: "", interval: "Monthly", department: "", targetCategory: "Global", managerEmail: "", operatorEmail: "", checklistSteps: [] });
    setEditingTemplateId(null);
  };

  const deleteTemplate = (id) => { 
    triggerModal("Confirm Deletion", "Confirm permanent deletion of this template from the database?", "confirm", async () => { 
      try {
        const res = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
        if (res.ok) setPmTemplates(pmTemplates.filter(t => t.id !== id)); 
      } catch (err) { triggerModal("Error", "Network error.", "error"); }
    }); 
  };

  const deleteTemplateCategory = (categoryName) => {
    triggerModal("Nuke SOP Category", `Are you sure you want to permanently delete ALL templates locked to the "${categoryName}" category?`, "error", async () => {
      try {
        const templatesToNuke = pmTemplates.filter(t => t.targetCategory === categoryName);
        await Promise.all(templatesToNuke.map(t => fetch(`/api/templates?id=${t.id}`, { method: 'DELETE' })));
        setPmTemplates(pmTemplates.filter(t => t.targetCategory !== categoryName));
        closeModal();
      } catch(err) { triggerModal("Error", "Failed to clear SOP category.", "error"); }
    });
  };

  return { 
    pmTemplates, setPmTemplates,
    newTemplate, setNewTemplate, editingTemplateId, isAddingTemplate, 
    handleAddTemplateSubmit, handleEditTemplateClick, cancelEditTemplate, 
    deleteTemplate, deleteTemplateCategory,
    handleTemplateManualUpload
  };
}