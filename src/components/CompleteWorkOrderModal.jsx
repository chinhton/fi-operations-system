import React, { useState } from 'react';

export default function CompleteWorkOrderModal({ workOrder, onClose, onConfirm }) {
  const [comments, setComments] = useState("");
  const [reportFile, setReportFile] = useState(null);

  if (!workOrder) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setReportFile({ name: file.name, size: (file.size / 1024).toFixed(1) + " KB", data: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!comments.trim()) return;
    onConfirm(comments.trim(), reportFile);
    setComments("");
    setReportFile(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm animate-entrance">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-300">
        <div className="bg-[#005596] px-6 py-4 flex justify-between items-center border-b border-[#003058]">
          <h3 className="text-white font-black text-sm tracking-widest uppercase">Complete Work Order</h3>
          <button onClick={onClose} className="text-blue-200 hover:text-white text-2xl font-bold leading-none transition">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <span className="block text-[10px] text-gray-500 font-black uppercase tracking-wider mb-1">Ticket</span>
            <span className="text-sm font-bold text-gray-900">{workOrder.title}</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">What was done?</label>
            <textarea
              autoFocus
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows="4"
              required
              placeholder="Describe the work performed to resolve this ticket..."
              className="w-full text-xs rounded border-gray-300 p-2.5 border bg-white font-mono focus:border-[#005596] focus:ring-1 focus:ring-[#005596] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Attach Contractor Report <span className="text-gray-400 font-normal normal-case">(Optional)</span>
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full text-xs rounded border-gray-300 p-2 border bg-white file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-gray-100 file:text-xs file:font-bold file:uppercase file:cursor-pointer hover:file:bg-gray-200"
            />
            {reportFile && (
              <span className="text-[10px] text-emerald-700 font-bold mt-1 block">✅ {reportFile.name} ({reportFile.size}) — will be saved to Contractor Reports</span>
            )}
          </div>
        </div>

        <div className="bg-gray-100 px-6 py-4 flex justify-end space-x-3 border-t border-gray-300">
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-300 bg-white rounded text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition shadow-sm">Cancel</button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!comments.trim()}
            className={`bg-[#005596] text-white px-6 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition shadow-sm ${!comments.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#00407a]'}`}
          >
            Mark Completed
          </button>
        </div>
      </div>
    </div>
  );
}
