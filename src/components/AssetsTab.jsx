import React, { useState, useRef } from 'react';

const CORPORATE_DEPARTMENTS = [
  "System Administration",
  "Facilities", 
  "Production: Sensor Assembly", 
  "Production: Final Assembly and Test", 
  "Production: Engineering"
];

const getCategoryIcon = (category) => {
  const cat = (category || "").toLowerCase();
  if (cat.includes('vacuum') || cat.includes('pump')) return '🌪️';
  if (cat.includes('flowhood') || cat.includes('fume') || cat.includes('vent')) return '🌬️';
  if (cat.includes('ups') || cat.includes('power') || cat.includes('circuit') || cat.includes('generator')) return '⚡';
  if (cat.includes('water') || cat.includes('plumbing') || cat.includes('rodi') || cat.includes('di water')) return '💧';
  if (cat.includes('chiller') || cat.includes('hvac') || cat.includes('cooling') || cat.includes('ac ')) return '❄️';
  if (cat.includes('chamber') || cat.includes('oven') || cat.includes('furnace')) return '🌡️';
  if (cat.includes('compressor') || cat.includes('air')) return '🗜️';
  if (cat.includes('radiation') || cat.includes('x-ray') || cat.includes('xrp') || cat.includes('laser') || cat.includes('sirona')) return '☢️';
  if (cat.includes('cleanroom') || cat.includes('lab') || cat.includes('scmos')) return '🔬';
  if (cat.includes('safety') || cat.includes('iipp') || cat.includes('hazard')) return '🦺';
  if (cat.includes('facilities') || cat.includes('production') || cat.includes('engineering') || cat.includes('assembly')) return '🏢'; 
  return '🗄️'; 
};

const formatDateForInput = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDateForSave = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const parseCSV = (str) => {
  const arr = [];
  let quote = false;
  let row = 0, col = 0;
  for (let c = 0; c < str.length; c++) {
      let cc = str[c], nc = str[c+1];
      arr[row] = arr[row] || [];
      arr[row][col] = arr[row][col] || '';
      if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; ++c; continue; }
      if (cc === '"') { quote = !quote; continue; }
      if (cc === ',' && !quote) { ++col; continue; }
      if (cc === '\n' && !quote) { ++row; col = 0; continue; }
      if (cc !== '\r') arr[row][col] += cc;
  }
  return arr;
};

const toTitleCase = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

const checkCategoryMatch = (templateCat, assetCat) => {
  if (!templateCat) return false;
  if (templateCat === "Global" || (Array.isArray(templateCat) && templateCat.includes("Global"))) return true;
  if (Array.isArray(templateCat)) return templateCat.includes(assetCat);
  return templateCat === assetCat;
};

export default function AssetsTab({
  assets = [], setAssets, users = [], pmTemplates = [],
  handleAddAssetSubmit, isAddingAsset, newAsset, setNewAsset, PM_CYCLE_OPTIONS,
  isSystemAdmin, deleteAssetCategory, handleUpdateAssetStatus, 
  calculateDaysRemaining, calculateNextPmDate, openPmModal, deleteAsset,
  uniqueCategories, currentUser, setCurrentUser
}) {
  
  const [assetSearch, setAssetSearch] = useState("");
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [activeCategoryModal, setActiveCategoryModal] = useState(null);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [overrideFreq, setOverrideFreq] = useState("");
  const [overrideDate, setOverrideDate] = useState("");

  const [syncProgress, setSyncProgress] = useState({ active: false, action: '', current: 0, total: 0 });

  const fileInputRef = useRef(null); 

  const [groupBy, setGroupBy] = useState(() => {
    return currentUser?.preferences?.assetGrouping || localStorage.getItem("fi_oms_asset_grouping") || "category";
  });

  const isManager = currentUser?.role?.toLowerCase() === 'manager';
const isDepartmentRestricted = !isSystemAdmin && !isManager;

  const handleGroupChange = async (type) => {
    setGroupBy(type);
    localStorage.setItem("fi_oms_asset_grouping", type); 
    
    if (currentUser && setCurrentUser) {
      const updatedUser = {
        ...currentUser,
        preferences: {
          ...(currentUser.preferences || {}),
          assetGrouping: type
        }
      };
      
      setCurrentUser(updatedUser);
      
      try {
        await fetch('/api/users?skip=/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser)
        });
      } catch (err) {}
    }
  };

  const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const filteredAssets = assets.filter(a =>
    a.name?.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.serial?.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.category?.toLowerCase().includes(assetSearch.toLowerCase()) ||
    (Array.isArray(a.department) ? a.department.join(' ').toLowerCase().includes(assetSearch.toLowerCase()) : a.department?.toLowerCase().includes(assetSearch.toLowerCase()))
  );

  const groupedAssets = filteredAssets.reduce((acc, asset) => {
    const key = groupBy === "category" 
        ? (asset.category || "Uncategorized") 
        : (Array.isArray(asset.department) ? asset.department[0] : (asset.department || "Unassigned"));
        
    if (!acc[key]) acc[key] = [];
    acc[key].push(asset);
    return acc;
  }, {});

  const handleBulkMoveGroup = async (oldGroupName) => {
    const isCat = groupBy === 'category';
    const groupTypeStr = isCat ? 'Category' : 'Department';
    
    const newGroupName = window.prompt(
      `BULK MERGE / RENAME:\n\nEnter the target ${groupTypeStr} name.\nIf you type an existing name, they will seamlessly merge.`, 
      oldGroupName
    );

    if (!newGroupName || newGroupName.trim() === "" || newGroupName === oldGroupName) return;

    const trimmedNewName = newGroupName.trim();
    const assetsInGroup = groupedAssets[oldGroupName] || [];

    if (!window.confirm(`You are about to permanently move ${assetsInGroup.length} systems from "${oldGroupName}" into "${trimmedNewName}".\n\nContinue?`)) return;

    if (setAssets) {
        const updatedAssetsList = assets.map(a => {
          const match = isCat ? (a.category || "Uncategorized") === oldGroupName : (Array.isArray(a.department) ? a.department[0] : (a.department || "Unassigned")) === oldGroupName;
          if (match) {
            return isCat ? { ...a, category: trimmedNewName } : { ...a, department: [trimmedNewName] };
          }
          return a;
        });
        setAssets(updatedAssetsList);
    }
    setActiveCategoryModal(trimmedNewName);

    try {
      await Promise.all(assetsInGroup.map(asset => {
        const updatedAsset = isCat ? { ...asset, category: trimmedNewName } : { ...asset, department: [trimmedNewName] };
        return window.fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedAsset)
        });
      }));
    } catch (err) {}
  };

  const handleExportCSV = () => {
    const headers = ["id", "name", "manufacturer", "model", "serial", "category", "location", "glAccount", "department", "operatorEmail", "status", "parentId"];
    const csvRows = [headers.join(",")];

    assets.forEach(asset => {
      const row = headers.map(header => {
        let val = "";
        if (header === "department") {
           val = Array.isArray(asset[header]) ? asset[header].join(';') : (asset[header] || "Unassigned");
        } else {
           val = asset[header] || "";
        }
        val = val.toString().replace(/"/g, '""'); 
        if (val.search(/("|,|\n)/g) >= 0) val = `"${val}"`; 
        return val;
      });
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FI-OMS_Assets_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const textData = event.target.result;
        const parsedData = parseCSV(textData);
        
        if (parsedData.length < 2) {
          alert("Invalid CSV format or file is empty.");
          return;
        }

        const headers = parsedData[0].map(h => h.trim());
        const importedAssets = [];

        for (let i = 1; i < parsedData.length; i++) {
          const rowData = parsedData[i];
          if (!rowData || rowData.length === 0 || !rowData[0]) continue; 

          const rowObj = {};
          headers.forEach((h, idx) => {
             rowObj[h] = rowData[idx] ? rowData[idx].trim() : '';
          });

          const rawName = rowObj['Description'] || rowObj['DESCRIPTION'] || rowObj['name'] || '';
          const name = toTitleCase(rawName);
          if (!name) continue; 

          const rawCategory = rowObj['Category Type'] || rowObj['category'] || "Imported Equipment";
          const category = toTitleCase(rawCategory);

          const rawManufacturer = rowObj['Manufacturer'] || rowObj['MANUFACTURER'] || rowObj['manufacturer'] || '';
          const manufacturer = toTitleCase(rawManufacturer);

          const rawLocation = rowObj['Location'] || rowObj['LOCATION'] || rowObj['location'] || '';
          const location = toTitleCase(rawLocation);

          const model = rowObj['Model Number'] || rowObj['model'] || '';
          const serial = rowObj['Serial Number'] || rowObj['SERIALNUM'] || rowObj['serial'] || 'N/A';
          const glAccount = rowObj['GL Account'] || rowObj['GLACCOUNT'] || rowObj['glAccount'] || '';
          
          const rawDept = rowObj['Assigned Department'] || rowObj['department'] || "Facilities";
          const parsedDept = rawDept.includes(';') ? rawDept.split(';').map(s => s.trim()) : [rawDept];
          
          let operatorEmail = "Unassigned";
          let rawOperator = rowObj['operatorEmail'] || rowObj['Asset Owner'] || rowObj['Named Owner'] || "";
          
          if (rawOperator) {
             rawOperator = rawOperator.replace(/\(Legacy List\)/gi, '').trim();
             
             if (rawOperator.includes('@')) {
                 operatorEmail = rawOperator;
             } else if (rawOperator.length > 0) {
                 const matchedUser = users.find(u => u.name && u.name.toLowerCase().includes(rawOperator.toLowerCase()));
                 if (matchedUser) {
                     operatorEmail = matchedUser.email;
                 } else {
                     operatorEmail = rawOperator;
                 }
             }
          }

          let status = "Active"; 
          const rawStatus = (rowObj['Status'] || rowObj['STATUS'] || rowObj['status'] || '').toUpperCase();
          if (rawStatus.includes('NOT WORKING') || rawStatus.includes('OFF')) {
              status = "Maintenance Due";
          } else if (rawStatus.includes('INACTIVE')) {
              status = "Inactive";
          } else if (rawStatus.includes('CORRECTIVE')) {
              status = "Corrective Maintenance";
          } else if (rawStatus && !rawStatus.includes('ACTIVE')) {
              status = rowObj['Status'] || "Active";
          }

          const finalAsset = {
            id: rowObj['id'] || `ast-import-${Date.now()}-${i}`,
            name: name,
            manufacturer: manufacturer,
            model: model,
            serial: serial,
            category: category,
            location: location,
            glAccount: glAccount,
            department: parsedDept,
            operatorEmail: operatorEmail,
            status: status,
            pmDates: {}, 
            parentId: rowObj['parentId'] || ""
          };

          importedAssets.push(finalAsset);
        }

        if (!window.confirm(`Found ${importedAssets.length} assets in CSV.\n\nFormatting: Applied Title Case to Names and Categories. Active emails successfully mapped.\n\nImport them now?`)) {
          e.target.value = null; 
          return;
        }

        setSyncProgress({ active: true, action: 'Importing', current: 0, total: importedAssets.length });

        for (let i = 0; i < importedAssets.length; i++) {
          await window.fetch('/api/assets?bulk=true', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(importedAssets[i])
          });
          
          setSyncProgress(prev => ({ ...prev, current: i + 1 }));
          await new Promise(resolve => setTimeout(resolve, 50)); 
        }
        
        window.location.reload(); 
        
      } catch (err) {
        console.error("Import error:", err);
        alert("Failed to parse CSV file. Ensure it is formatted correctly.");
        setSyncProgress({ active: false, action: '', current: 0, total: 0 });
      }
      e.target.value = null; 
    };
    reader.readAsText(file);
  };

  const handleMassDelete = async () => {
    const targetAssets = filteredAssets;
    if (targetAssets.length === 0) { alert("No assets found to delete."); return; }

    const confirm1 = window.confirm(`🚨 DANGER: You are about to permanently delete ${targetAssets.length} assets.\n\nThis will wipe them from the Azure database completely. This action CANNOT be undone.\n\nAre you absolutely sure you want to proceed?`);
    if (!confirm1) return;

    const confirm2 = window.prompt(`To confirm mass deletion of ${targetAssets.length} assets, please type DELETE in all caps:`);
    if (confirm2 !== "DELETE") { alert("Mass deletion cancelled."); return; }

    setSyncProgress({ active: true, action: 'Deleting', current: 0, total: targetAssets.length });

    try {
      for (let i = 0; i < targetAssets.length; i++) {
        await window.fetch(`/api/assets?id=${targetAssets[i].id}&bulk=true`, { method: 'DELETE' });
        
        setSyncProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      window.location.reload();
    } catch (err) {
      console.error("Mass delete error:", err);
      alert("An error occurred during mass deletion. Partial delete may have occurred.");
      window.location.reload();
    }
  };

  const openAddModal = () => {
    // Pre-fills with your department for speed, but remains unlocked for Managers!
    const defaultDept = currentUser?.department && currentUser.department !== "Unassigned" ? [currentUser.department] : [];

  const openRegisterForEdit = (asset) => {
    setNewAsset(asset);
    setIsAddingNewCategory(false);
    setOverrideFreq("");
    setOverrideDate("");
    setIsRegisterModalOpen(true);
  };

  // --- NEW: AUTO-SYNC CATEGORY LOGIC ---
  const handleFieldChange = (field, value) => {
    const updatedAsset = { ...newAsset, [field]: value };
    
    // Automatically construct the folder name if they change Manufacturer, Name, or Model
    if (['name', 'manufacturer', 'model'].includes(field)) {
      const mfr = updatedAsset.manufacturer ? updatedAsset.manufacturer.trim() : "";
      const name = updatedAsset.name ? updatedAsset.name.trim() : "";
      const mod = updatedAsset.model ? updatedAsset.model.trim() : "";
      
      let autoCat = [];
      if (mfr) autoCat.push(mfr);
      if (name) autoCat.push(name);
      
      let catString = autoCat.join(' | ');
      if (catString && mod) catString += ` - ${mod}`;
      else if (!catString && mod) catString = mod;
      
      updatedAsset.category = catString;
      
      // Automatically switch to "New Category" view so they can see it typing out
      setIsAddingNewCategory(true);
    }
    
    setNewAsset(updatedAsset);
  };

  const handleLocalAssetSubmit = async (e) => {
    e.preventDefault();
    
    if (!newAsset.name || newAsset.name.trim() === "") {
      alert("⚠️ Equipment Name is required. Please fill it out.");
      return; 
    }
    
    if (!newAsset.category || newAsset.category.trim() === "") {
      alert("⚠️ Category Type is required. Please select or add one.");
      return; 
    }

    try {
      await handleAddAssetSubmit(e);
      setIsRegisterModalOpen(false);
    } catch (error) {
      console.error("Failed to save asset:", error);
      alert("An error occurred while communicating with the database.");
    }
  };

  const categoryDropdownOptions = [...new Set([...(uniqueCategories || []), newAsset?.category])].filter(Boolean);

  return (
    <div className="space-y-8 animate-entrance relative">
      
      {/* DIRECTORY HEADER & CONTROLS */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <button 
            onClick={openRegisterForNew}
            className="w-full sm:w-auto bg-[#005596] hover:bg-[#00407a] text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider shadow-md transition-all transform hover:-translate-y-0.5"
          >
            ➕ Register New Asset
          </button>

          {isSystemAdmin && (
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button 
                onClick={handleExportCSV}
                className="flex-1 sm:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-300 transition-colors"
              >
                📤 Export CSV
              </button>
              <button 
                onClick={() => fileInputRef.current.click()}
                className="flex-1 sm:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-300 transition-colors"
              >
                📥 Import CSV
              </button>
              <button 
                onClick={handleMassDelete}
                className="flex-1 sm:flex-none px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold uppercase tracking-wider rounded-lg border border-red-200 transition-colors"
              >
                🧨 Wipe List
              </button>
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
            </div>
          )}
        </div>

        <input 
          type="text" 
          placeholder="Search by Name, S/N, Category, or Dept..." 
          value={assetSearch}
          onChange={(e) => setAssetSearch(e.target.value)}
          className="w-full xl:w-96 text-xs rounded-lg border border-gray-300 p-3 bg-gray-50 shadow-inner focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005596] transition-all"
        />
      </div>
      
      {/* MINIMIZED FOLDER DIRECTORY */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        <div className="bg-[#1A2530] text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between">
          <h3 className="font-bold text-sm tracking-wide uppercase">Hardware Directory</h3>
          
          <div className="flex items-center space-x-4 mt-3 sm:mt-0">
            <div className="flex bg-[#003058] p-1 rounded-lg border border-[#00407a] shadow-inner">
              <button 
                onClick={() => handleGroupChange('category')} 
                className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${groupBy === 'category' ? 'bg-white text-[#005596] shadow-sm' : 'text-blue-200 hover:text-white'}`}
              >
                By Category
              </button>
              <button 
                onClick={() => handleGroupChange('department')} 
                className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${groupBy === 'department' ? 'bg-white text-[#005596] shadow-sm' : 'text-blue-200 hover:text-white'}`}
              >
                By Department
              </button>
            </div>
            <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded-full hidden md:inline-block">{assets.length} Systems</span>
          </div>
        </div>
        
        {Object.keys(groupedAssets || {}).length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">No assets registered matching your search.</div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 bg-gray-50/50">
            {Object.entries(groupedAssets || {}).map(([groupKey, groupItems]) => (
              <div 
                key={groupKey} 
                onClick={() => setActiveCategoryModal(groupKey)}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md cursor-pointer transition flex flex-col justify-center items-center text-center group relative h-32"
              >
                {isSystemAdmin && groupBy === 'category' && groupKey !== "Uncategorized" && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteAssetCategory(groupKey); }} 
                    className="absolute top-2 right-2 text-[9px] text-red-500 hover:text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded transition opacity-0 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                )}
                
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform opacity-90">{getCategoryIcon(groupKey)}</div>
                
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-1 line-clamp-1">{groupKey}</h4>
                <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded-full">{groupItems.length} System{groupItems.length !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- CATEGORY FOLDER POPUP (TABLE VIEW) --- */}
      {activeCategoryModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] lg:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col animate-entrance relative border border-gray-300">
            
            <div className="bg-[#005596] text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-3">
                <h3 className="font-bold text-sm tracking-wide uppercase">{getCategoryIcon(activeCategoryModal)} {groupBy === 'category' ? 'Category' : 'Department'}: {activeCategoryModal}</h3>
                {isSystemAdmin && (
                  <button 
                    onClick={() => handleBulkMoveGroup(activeCategoryModal)}
                    className="text-[9px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded border border-white/30 font-bold uppercase tracking-wider transition-colors shadow-sm ml-4"
                  >
                    ✏️ Rename / Merge Folder
                  </button>
                )}
              </div>
              <button onClick={() => setActiveCategoryModal(null)} className="text-white hover:text-red-400 text-2xl leading-none transition">&times;</button>
            </div>
            
            <div className="overflow-auto flex-1 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-3.5">Asset Name</th>
                    <th className="px-6 py-3.5">Model / Serial No</th>
                    <th className="px-6 py-3.5">Status & PM Cycle Tracker</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {(groupedAssets[activeCategoryModal] || []).map((asset) => {
                    const assetTemplates = (pmTemplates || []).filter(t => checkCategoryMatch(t.targetCategory, asset.category));
                    const freqs = [...new Set(assetTemplates.map(t => t.interval))];
                    
                    const checkStatus = (asset.status || "").toUpperCase();

                    return (
                      <tr key={asset.serial} className="hover:bg-gray-50/55 transition">
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-900 block">{asset.name}</span>
                          
                          {asset.parentId && (
                              <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase block mt-1 w-max">
                                🔗 Linked to: {assets.find(a => a.id === asset.parentId)?.name || 'Unknown Asset'}
                              </span>
                          )}

                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {asset.department && <span className="text-[8px] bg-blue-100 text-[#005596] px-1.5 py-0.5 rounded font-bold uppercase" title={`Department: ${Array.isArray(asset.department) ? asset.department.join(', ') : asset.department}`}>DEPT: {Array.isArray(asset.department) ? asset.department.join(', ') : asset.department}</span>}
                            {asset.operatorEmail && <span className="text-[8px] bg-sky-100 text-[#00A1E4] px-1.5 py-0.5 rounded font-bold uppercase" title={`Operator: ${asset.operatorEmail}`}>OPR Assigned</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono">
                          <span className="block text-gray-700">Mfr: {asset.manufacturer || 'N/A'}</span>
                          <span className="block text-gray-700">Mod: {asset.model}</span>
                          <span className="block text-[11px] text-gray-400">S/N: {asset.serial}</span>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={checkStatus === 'ACTIVE' ? 'Active' : checkStatus === 'INACTIVE' ? 'Inactive' : asset.status}
                            onChange={(e) => handleUpdateAssetStatus(asset.id, e.target.value)}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-transparent cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#005596] ${
                              checkStatus === "OPERATIONAL" ? "bg-green-100 text-green-800" :
                              checkStatus === "ACTIVE" ? "bg-emerald-100 text-emerald-800" :
                              checkStatus === "INACTIVE" ? "bg-gray-200 text-gray-600" :
                              checkStatus === "MAINTENANCE DUE" ? "bg-yellow-100 text-yellow-800" :
                              checkStatus === "OUT OF CALIBRATION" ? "bg-red-100 text-red-800" :
                              (checkStatus === "CORRECTIVE MAINTENANCE" || checkStatus === "CORRECTIVE ACTION") ? "bg-orange-100 text-orange-800" :
                              "bg-gray-100 text-gray-800"
                            }`}
                          >
                            <option value="Operational">Operational</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Maintenance Due">Maintenance Due</option>
                            <option value="Out of Calibration">Out of Calibration</option>
                            <option value="Corrective Maintenance">Corrective Maintenance</option>
                          </select>
                          
                          <div className="flex flex-col mt-3 space-y-2 border-t border-gray-100 pt-2">
                            {freqs.length === 0 ? (
                              <div>
                                <span className="text-[9px] text-gray-400 uppercase font-bold block mb-1.5">No Active Cycles</span>
                              </div>
                            ) : (
                              freqs.map(freq => {
                                const targetDate = asset.pmDates?.[freq] || asset.lastPmDate;
                                const daysRemaining = calculateDaysRemaining(targetDate, freq);
                                const isCompletedToday = targetDate === todayStr;
                                
                                return (
                                  <div key={freq} className="flex flex-col text-[10px]">
                                    <div className="flex justify-between items-center mb-0.5 group">
                                      <div className="flex items-center space-x-1.5">
                                        <span className="text-[#005596] font-bold uppercase tracking-wider">{freq}</span>
                                      </div>
                                      {isCompletedToday ? (
                                          <span className="font-bold px-1.5 py-0.5 rounded-sm w-max bg-green-100 text-green-700">
                                              ✅ Completed Today
                                          </span>
                                      ) : daysRemaining !== null ? (
                                        <span className={`font-bold px-1.5 py-0.5 rounded-sm w-max ${daysRemaining < 0 ? 'bg-red-50 text-red-600' : daysRemaining <= 7 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                          ⏳ {daysRemaining < 0 ? `Overdue (${Math.abs(daysRemaining)}d)` : `Due in ${daysRemaining}d`}
                                        </span>
                                      ) : (
                                        <span className="font-bold px-1.5 py-0.5 rounded-sm bg-gray-100 text-gray-600">⏳ Needs Baseline</span>
                                      )}
                                    </div>
                                    {targetDate && <span className="text-gray-500 font-mono text-[9px]">Next: {calculateNextPmDate(targetDate, freq)}</span>}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-3">
                          <button onClick={() => openRegisterForEdit(asset)} className="text-xs font-bold text-gray-600 hover:text-gray-900 transition">Edit</button>
                          
                          {isSystemAdmin && (
                            <button onClick={() => deleteAsset(asset.id)} className="text-xs font-bold text-red-600 hover:text-red-800 transition">Delete</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(!groupedAssets[activeCategoryModal] || groupedAssets[activeCategoryModal].length === 0) && (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500 text-xs">No assets remaining in this group.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="bg-gray-100 px-6 py-4 flex justify-end shrink-0 border-t border-gray-200">
              <button onClick={() => setActiveCategoryModal(null)} className="px-6 py-2.5 border border-gray-300 rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-white transition shadow-sm">Close Folder</button>
            </div>
          </div>
        </div>
      )}

      {/* --- ASSET REGISTRATION / EDIT MODAL --- */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-entrance relative">
            <button onClick={() => setIsRegisterModalOpen(false)} className="absolute top-4 right-5 text-white hover:text-gray-200 font-bold text-xl z-10">&times;</button>
            
            <div className="bg-[#005596] text-white px-6 py-4">
              <h3 className="font-bold text-sm tracking-wide uppercase">
                {newAsset.id ? 'Edit System Information' : 'Register New Dynamic Lab/Cleanroom Asset'}
              </h3>
            </div>
            
            <form onSubmit={handleLocalAssetSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* --- AUTO-SYNC INPUTS --- */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Equipment Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={newAsset.name || ""} 
                    onChange={(e) => handleFieldChange('name', e.target.value)} 
                    placeholder="e.g. Air Compressor" 
                    className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category Type <span className="text-red-500">*</span></label>
                  {isAddingNewCategory ? (
                    <div className="flex space-x-2">
                      <input 
                        type="text" 
                        required
                        value={newAsset.category || ""} 
                        onChange={(e) => setNewAsset({...newAsset, category: e.target.value})} 
                        placeholder="Type new category..." 
                        className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none shadow-inner" 
                        autoFocus
                      />
                      <button 
                        type="button" 
                        onClick={() => { setIsAddingNewCategory(false); setNewAsset({...newAsset, category: ""}); }} 
                        className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-bold transition shadow-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <select 
                        required
                        value={newAsset.category || ""} 
                        onChange={(e) => setNewAsset({...newAsset, category: e.target.value})} 
                        className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none shadow-sm cursor-pointer"
                      >
                        <option value="">-- Select Category --</option>
                        {categoryDropdownOptions.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        onClick={() => { setIsAddingNewCategory(true); setNewAsset({...newAsset, category: ""}); }} 
                        className="px-3 py-2 bg-[#00A1E4] hover:bg-[#0081b8] text-white rounded text-xs font-bold transition whitespace-nowrap shadow-sm"
                      >
                        ➕ New
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Manufacturer</label>
                  <input 
                    type="text" 
                    value={newAsset.manufacturer || ""} 
                    onChange={(e) => handleFieldChange('manufacturer', e.target.value)} 
                    placeholder="e.g. Quincy" 
                    className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Model Identifier</label>
                  <input 
                    type="text" 
                    value={newAsset.model || ""} 
                    onChange={(e) => handleFieldChange('model', e.target.value)} 
                    placeholder="e.g. KNWA00-B/H" 
                    className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Serial Number</label>
                  <input type="text" value={newAsset.serial || ""} onChange={(e) => setNewAsset({...newAsset, serial: e.target.value})} placeholder="e.g. FC-90812-C" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">GL Account</label>
                  <input type="text" value={newAsset.glAccount || ""} onChange={(e) => setNewAsset({...newAsset, glAccount: e.target.value})} placeholder="e.g. DD-23000-2030" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Location / Bay</label>
                  <input type="text" value={newAsset.location || ""} onChange={(e) => setNewAsset({...newAsset, location: e.target.value})} placeholder="e.g. Cleanroom Bay 3" className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">Link To Facility Asset (Sub-Equipment)</label>
                  <select 
                    value={newAsset.parentId || ""} 
                    onChange={(e) => setNewAsset({...newAsset, parentId: e.target.value})} 
                    className="w-full text-xs rounded border-purple-200 shadow-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 p-2.5 border bg-purple-50/30 outline-none"
                  >
                    <option value="">-- Standalone Primary Asset --</option>
                    {assets.filter(a => !a.parentId && a.id !== newAsset.id).map(a => (
                      <option key={`link-${a.id}`} value={a.id}>🔗 Link to: {a.name} ({a.serial})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#005596] uppercase tracking-wider mb-2">Assign Department (Multi-Select)</label>
                  <div className="flex flex-col space-y-2">
                    <select 
                      value="" 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        
                        let current = newAsset.department;
                        let selectedArray = Array.isArray(current) ? current : (current && current !== "Unassigned" ? [current] : []);
                        
                        if (!selectedArray.includes(val)) {
                          setNewAsset({...newAsset, department: [...selectedArray, val]});
                        }
                      }} 
                      disabled={isDepartmentRestricted}
                      className={`w-full text-xs rounded border-[#005596]/30 shadow-sm p-2.5 border outline-none transition-colors ${
                        isDepartmentRestricted 
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                          : 'bg-blue-50/30 focus:border-[#005596] focus:ring-1 focus:ring-[#005596]'
                      }`}
                    >
                      <option value="">-- Add Department --</option>
                      {isDepartmentRestricted ? (
                        !(Array.isArray(newAsset.department) ? newAsset.department : []).includes(userDept) && <option value={userDept}>{userDept}</option>
                      ) : (
                        CORPORATE_DEPARTMENTS.filter(dept => {
                            let current = newAsset.department;
                            let selectedArray = Array.isArray(current) ? current : (current && current !== "Unassigned" ? [current] : []);
                            return !selectedArray.includes(dept);
                        }).map(dept => (
                          <option key={`dept-${dept}`} value={dept}>{dept}</option>
                        ))
                      )}
                    </select>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(!newAsset.department || (Array.isArray(newAsset.department) && newAsset.department.length === 0)) ? (
                         <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center shadow-sm">
                            Unassigned
                         </span>
                      ) : (Array.isArray(newAsset.department) ? newAsset.department : [newAsset.department]).map(dept => (
                         <span key={dept} className="bg-blue-100 text-[#005596] border border-blue-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center shadow-sm">
                            {dept}
                            {!isDepartmentRestricted && (
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    const arr = Array.isArray(newAsset.department) ? newAsset.department : [newAsset.department];
                                    const filtered = arr.filter(c => c !== dept);
                                    setNewAsset({...newAsset, department: filtered.length > 0 ? filtered : "Unassigned"});
                                  }} 
                                  className="ml-1.5 text-blue-500 hover:text-[#005596] font-bold text-sm leading-none"
                                >
                                  &times;
                                </button>
                            )}
                         </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#00A1E4] uppercase tracking-wider mb-2">Assign Operator (Optional)</label>
                  <select 
                    value={newAsset.operatorEmail || ""} 
                    onChange={(e) => setNewAsset({...newAsset, operatorEmail: e.target.value})} 
                    className="w-full text-xs rounded border-[#00A1E4]/30 shadow-sm focus:border-[#00A1E4] focus:ring-1 focus:ring-[#00A1E4] p-2.5 border bg-sky-50/30 outline-none"
                  >
                    <option value="">-- Leave Unassigned --</option>
                    {users.map(u => (
                      <option key={`opr-${u.email}`} value={u.email}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 mt-4 p-5 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                  <label className="block text-xs font-bold text-[#005596] uppercase tracking-wider mb-1">
                    🗓️ Maintenance Baseline & Schedule
                  </label>
                  <p className="text-[10px] text-slate-500 mb-4">
                    Establish or adjust the last completed dates for specific PM cycles to anchor the automated tracker.
                  </p>

                  {Object.keys(newAsset.pmDates || {}).length > 0 && (
                    <div className="mb-4 space-y-2">
                      {Object.entries(newAsset.pmDates).map(([freq, date]) => (
                        <div key={freq} className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-start sm:space-x-4 bg-white p-2.5 rounded border border-slate-200 shadow-sm gap-y-2">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider w-full sm:w-28 shrink-0">{freq}</span>
                          <input
                            type="date"
                            value={formatDateForInput(date)}
                            onChange={(e) => {
                              const newDates = { ...(newAsset.pmDates || {}), [freq]: formatDateForSave(e.target.value) };
                              setNewAsset({ ...newAsset, pmDates: newDates });
                            }}
                            className="w-full sm:w-auto text-xs border border-gray-300 rounded p-1.5 focus:outline-none focus:border-[#005596] focus:ring-1 focus:ring-[#005596] text-slate-700"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newDates = { ...newAsset.pmDates };
                              delete newDates[freq];
                              setNewAsset({ ...newAsset, pmDates: newDates });
                            }}
                            className="text-gray-400 hover:text-red-500 font-bold text-[10px] uppercase tracking-wider px-2 transition-colors w-full sm:w-auto text-right sm:text-left"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 pt-1">
                    <select
                      value={overrideFreq}
                      onChange={(e) => setOverrideFreq(e.target.value)}
                      className="w-full sm:w-auto text-xs border border-gray-300 rounded p-2 focus:outline-none focus:border-[#005596] focus:ring-1 focus:ring-[#005596] shadow-sm text-slate-700 cursor-pointer"
                    >
                      <option value="">-- Select Cycle --</option>
                      {PM_CYCLE_OPTIONS.map(opt => <option key={`over-${opt}`} value={opt}>{opt}</option>)}
                    </select>
                    <input
                      type="date"
                      value={overrideDate}
                      onChange={(e) => setOverrideDate(e.target.value)}
                      className="w-full sm:w-auto text-xs border border-gray-300 rounded p-2 focus:outline-none focus:border-[#005596] focus:ring-1 focus:ring-[#005596] shadow-sm text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!overrideFreq || !overrideDate) return;
                        const newDates = { ...(newAsset.pmDates || {}), [overrideFreq]: formatDateForSave(overrideDate) };
                        setNewAsset({ ...newAsset, pmDates: newDates });
                        setOverrideFreq("");
                        setOverrideDate("");
                      }}
                      className="w-full sm:w-auto bg-[#00A1E4] hover:bg-[#0081b8] text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all whitespace-nowrap"
                    >
                      ➕ Set Baseline
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsRegisterModalOpen(false)} className="px-5 py-2.5 border border-gray-300 rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={isAddingAsset} className={`bg-[#00A1E4] hover:bg-[#00A1E4]/90 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition-all ${isAddingAsset ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isAddingAsset ? 'Processing...' : (newAsset.id ? 'Update Asset' : 'Commit Asset')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PROGRESS OVERLAY FOR IMPORTS / WIPES --- */}
      {syncProgress.active && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center animate-entrance">
            <span className="text-5xl mb-4 block animate-bounce">
              {syncProgress.action === 'Deleting' ? '🗑️' : '📥'}
            </span>
            <h3 className={`font-black text-xl uppercase tracking-wider mb-2 ${syncProgress.action === 'Deleting' ? 'text-red-600' : 'text-[#005596]'}`}>
              {syncProgress.action === 'Deleting' ? 'Wiping Database...' : 'Importing Records...'}
            </h3>
            <p className="text-gray-500 font-bold mb-6">Please do not close this window or refresh the page.</p>
            
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden shadow-inner">
              <div 
                className={`${syncProgress.action === 'Deleting' ? 'bg-red-500' : 'bg-[#00A1E4]'} h-4 rounded-full transition-all duration-300`} 
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm font-mono font-bold text-gray-700">
              {syncProgress.action === 'Deleting' ? 'Deleted' : 'Imported'} {syncProgress.current} of {syncProgress.total} records
            </p>
          </div>
        </div>
      )}

    </div>
  );
}