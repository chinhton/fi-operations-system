import { useMemo } from 'react';

export default function useDashboardStats(users, assets, workOrders, pmTemplates, history) {
  return useMemo(() => {
    const pendingApprovals = (users || []).filter(u => u && !u.approved);
    const activeAccounts = (users || []).filter(u => u && u.approved);
    
    const operationalCount = assets.filter(a => a.status === "Operational").length;
    const overdueCount = assets.filter(a => a.status === "Maintenance Due").length;
    const calibrationCount = assets.filter(a => a.status === "Out of Calibration").length;
    const correctiveCount = assets.filter(a => a.status === "Corrective Maintenance").length;
    
    const complianceRate = assets.length === 0 ? 100 : Math.round(((assets.length - (overdueCount + calibrationCount + correctiveCount)) / assets.length) * 100);
    
    const manualCount = assets.reduce((sum, a) => sum + (a.manuals ? a.manuals.length : (a.manual ? 1 : 0)), 0);
    const assetsWithManuals = assets.filter(a => (a.manuals && a.manuals.length > 0) || a.manual);
    const uniqueCategories = Array.from(new Set((assets || []).map(a => a.category).filter(Boolean)));

    const navData = {
      dashboard: { icon: '📊', label: 'Operations Dashboard' },
      workOrders: { icon: '🔧', label: 'Dispatch Work Orders', badge: workOrders.filter(w => w.status !== "Completed").length },
      assets: { icon: '🏭', label: 'Facility Assets', badge: assets.length },
      manuals: { icon: '📖', label: 'Equipment Manuals', badge: manualCount },
      templates: { icon: '⚙️', label: 'PM Task Configurations', badge: pmTemplates.length },
      history: { icon: '📜', label: 'Executed Audits', badge: history.length }
    };

    return {
      pendingApprovals, activeAccounts, operationalCount, overdueCount, calibrationCount, 
      correctiveCount, complianceRate, assetsWithManuals, uniqueCategories, navData
    };
  }, [users, assets, workOrders, pmTemplates, history]);
}