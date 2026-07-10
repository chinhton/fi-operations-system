import { useMemo } from 'react';

export default function useDashboardStats(users, assets, workOrders, pmTemplates, history) {
  return useMemo(() => {
    // Bullet-proofing against undefined Cosmos DB responses
    const safeUsers = users || [];
    const safeAssets = assets || [];
    const safeWorkOrders = workOrders || [];
    const safePmTemplates = pmTemplates || [];
    const safeHistory = history || [];

    const pendingApprovals = safeUsers.filter(u => u && !u.approved);
    const activeAccounts = safeUsers.filter(u => u && u.approved);
    
    const operationalCount = safeAssets.filter(a => a.status === "Operational").length;
    const overdueCount = safeAssets.filter(a => a.status === "Maintenance Due").length;
    const calibrationCount = safeAssets.filter(a => a.status === "Out of Calibration").length;
    const correctiveCount = safeAssets.filter(a => a.status === "Corrective Maintenance").length;
    
    const complianceRate = safeAssets.length === 0 ? 100 : Math.round(((safeAssets.length - (overdueCount + calibrationCount + correctiveCount)) / safeAssets.length) * 100);
    
    const manualCount = safeAssets.reduce((sum, a) => sum + (a.manuals ? a.manuals.length : (a.manual ? 1 : 0)), 0);
    const assetsWithManuals = safeAssets.filter(a => (a.manuals && a.manuals.length > 0) || a.manual);
    const uniqueCategories = Array.from(new Set(safeAssets.map(a => a.category).filter(Boolean)));

    const navData = {
      dashboard: { icon: '📊', label: 'Operations Dashboard' },
      workOrders: { icon: '🔧', label: 'Dispatch Work Orders', badge: safeWorkOrders.filter(w => w.status !== "Completed").length },
      assets: { icon: '🏭', label: 'Facility Assets', badge: safeAssets.length },
      manuals: { icon: '📖', label: 'Equipment Manuals', badge: manualCount },
      templates: { icon: '⚙️', label: 'PM Task Configurations', badge: safePmTemplates.length },
      history: { icon: '📜', label: 'Executed Audits', badge: safeHistory.length }
    };

    return {
      pendingApprovals, activeAccounts, operationalCount, overdueCount, calibrationCount, 
      correctiveCount, complianceRate, assetsWithManuals, uniqueCategories, navData
    };
  }, [users, assets, workOrders, pmTemplates, history]);
}