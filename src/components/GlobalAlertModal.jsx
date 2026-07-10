import React from 'react';

export default function GlobalAlertModal({ show, title, message, type, onConfirm, onClose }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-sm w-full overflow-hidden animate-entrance">
        <div className={`p-4 text-white text-xs font-bold uppercase tracking-wider ${type === "error" ? "bg-red-600" : "bg-[#005596]"}`}>
          {type === "error" ? "⚠️ System Error" : "ℹ️ System Message"}
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-700 leading-relaxed font-medium">{message}</p>
        </div>
        <div className="bg-gray-50 px-5 py-3.5 flex justify-end space-x-2 border-t border-gray-100">
          {onConfirm ? (
            <>
              <button onClick={onConfirm} className="bg-[#005596] text-white text-[11px] font-bold uppercase px-3 py-1.5 rounded transition">Confirm</button>
              <button onClick={onClose} className="border bg-white text-gray-700 text-[11px] font-bold uppercase px-3 py-1.5 rounded transition">Cancel</button>
            </>
          ) : (
            <button onClick={onClose} className="bg-[#005596] text-white text-[11px] font-bold uppercase px-4 py-1.5 rounded transition">OK</button>
          )}
        </div>
      </div>
    </div>
  );
}