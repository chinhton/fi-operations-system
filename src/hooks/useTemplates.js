import { useState } from 'react';

export default function useTemplates(triggerModal, closeModal, pmTemplates, setPmTemplates) {
  // WE MOVED THE STATE INSIDE THE HOOK
  const [pmTemplates, setPmTemplates] = useState([]); 
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);

  // --- THE FIX: MOVED INSIDE THE HOOK ---
  const handleTemplateManualUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Saves the Base64 PDF data directly into the newTemplate state
        setNewTemplate({ 
          ...newTemplate, 
          attachedManualName: file.name,
          attachedManualData: reader.result 
        });
      };
      reader.readAsDataURL(file);
    }
  };
  // --------------------------------------

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
        // Also ensure the manual data gets sent to the database!
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

  // --- THE FIX: ADDED TO THE RETURN BLOCK ---
  return { 
    pmTemplates, setPmTemplates,
    newTemplate, setNewTemplate, editingTemplateId, isAddingTemplate, 
    handleAddTemplateSubmit, handleEditTemplateClick, cancelEditTemplate, 
    deleteTemplate, deleteTemplateCategory,
    handleTemplateManualUpload // <--- Exposed here!
  };
}