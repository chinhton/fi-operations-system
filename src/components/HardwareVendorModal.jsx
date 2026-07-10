import React from 'react';

export default function HardwareVendorModal({ 
  show, activeAssetDetails, onClose, 
  newPart, setNewPart, addPart, removePart, 
  newVendor, setNewVendor, addVendor, removeVendor 
}) {
  if (!show || !activeAssetDetails) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-entrance">
        <div className="bg-[#1A2530] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-sm tracking-wide uppercase">Hardware & Vendor Profile</h3>
            <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">{activeAssetDetails.name} (SN: {activeAssetDetails.serial})</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl font-bold leading-none transition">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-grow bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* PARTS LIST SECTION */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h4 className="font-bold text-xs text-[#005596] uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Approved Parts List</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto mb-4 pr-2">
                {(!activeAssetDetails.parts || activeAssetDetails.parts.length === 0) ? (
                  <p className="text-xs text-gray-500 italic">No approved parts logged.</p>
                ) : (
                  activeAssetDetails.parts.map(part => (
                    <div key={part.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded border border-gray-100">
                      <div>
                        <span className="block text-xs font-bold text-gray-800">{part.name}</span>
                        <span className="block text-[10px] text-gray-500 font-mono">PN: {part.partNumber} {part.stock && `| Stock: ${part.stock}`}</span>
                      </div>
                      <button onClick={() => removePart(part.id)} className="text-red-400 hover:text-red-700 text-lg font-bold leading-none">&times;</button>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={addPart} className="bg-gray-50 p-3 rounded border border-gray-200 space-y-2">
                <input type="text" placeholder="Part Name (e.g., O-Ring)" value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} className="w-full text-[10px] p-2 rounded border border-gray-300 focus:outline-none focus:border-[#005596]" required />
                <div className="flex space-x-2">
                  <input type="text" placeholder="Part Number" value={newPart.partNumber} onChange={e => setNewPart({...newPart, partNumber: e.target.value})} className="w-2/3 text-[10px] p-2 rounded border border-gray-300 focus:outline-none focus:border-[#005596]" required />
                  <input type="text" placeholder="Stock Qty" value={newPart.stock} onChange={e => setNewPart({...newPart, stock: e.target.value})} className="w-1/3 text-[10px] p-2 rounded border border-gray-300 focus:outline-none focus:border-[#005596]" />
                </div>
                <button type="submit" className="w-full bg-[#00A1E4] text-white text-[10px] font-bold uppercase py-2 rounded shadow-sm hover:bg-[#0081b8] transition">Add Part</button>
              </form>
            </div>

            {/* VENDOR MANAGEMENT SECTION */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h4 className="font-bold text-xs text-[#005596] uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Vendor Management</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto mb-4 pr-2">
                {(!activeAssetDetails.vendors || activeAssetDetails.vendors.length === 0) ? (
                  <p className="text-xs text-gray-500 italic">No approved vendors linked.</p>
                ) : (
                  activeAssetDetails.vendors.map(vendor => (
                    <div key={vendor.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded border border-gray-100">
                      <div>
                        <span className="block text-xs font-bold text-gray-800">{vendor.name}</span>
                        <span className="block text-[10px] text-gray-500 font-mono">{vendor.serviceType} | {vendor.contactInfo}</span>
                      </div>
                      <button onClick={() => removeVendor(vendor.id)} className="text-red-400 hover:text-red-700 text-lg font-bold leading-none">&times;</button>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={addVendor} className="bg-gray-50 p-3 rounded border border-gray-200 space-y-2">
                <input type="text" placeholder="Vendor Name (e.g., Applied Materials)" value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} className="w-full text-[10px] p-2 rounded border border-gray-300 focus:outline-none focus:border-[#005596]" required />
                <div className="flex space-x-2">
                  <input type="text" placeholder="Service/Supply Type" value={newVendor.serviceType} onChange={e => setNewVendor({...newVendor, serviceType: e.target.value})} className="w-1/2 text-[10px] p-2 rounded border border-gray-300 focus:outline-none focus:border-[#005596]" />
                  <input type="text" placeholder="Contact/Phone" value={newVendor.contactInfo} onChange={e => setNewVendor({...newVendor, contactInfo: e.target.value})} className="w-1/2 text-[10px] p-2 rounded border border-gray-300 focus:outline-none focus:border-[#005596]" required />
                </div>
                <button type="submit" className="w-full bg-[#00A1E4] text-white text-[10px] font-bold uppercase py-2 rounded shadow-sm hover:bg-[#0081b8] transition">Add Vendor</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}