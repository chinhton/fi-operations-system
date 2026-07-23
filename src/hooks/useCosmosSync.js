import { useEffect } from 'react';

export default function useCosmosSync(
  currentUser, 
  setUsers, 
  setAssets, 
  setWorkOrders, 
  setPmTemplates, 
  setHistory
) {
  useEffect(() => {
    // Only fetch data if a user is securely logged in
    if (!currentUser) return; 

    const fetchCosmosData = async () => {
      try {
        // Force Azure to bypass aggressive edge caching and fetch fresh data
        const fetchOpts = { 
          cache: 'no-store', 
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' } 
        };

        // Fire all API requests in parallel for maximum speed
        const [usersRes, assetsRes, woRes, templatesRes, historyRes] = await Promise.all([
          fetch('/api/users', fetchOpts),
          fetch('/api/assets', fetchOpts),
          fetch('/api/workorders', fetchOpts),
          fetch('/api/templates', fetchOpts),
          fetch('/api/history', fetchOpts)
        ]);

        // Hydrate the state if responses are good, explicitly log errors if Azure rejects them
        if (usersRes.ok) setUsers(await usersRes.json());
        else console.error("❌ Azure Users Sync Failed:", await usersRes.text());

        if (assetsRes.ok) setAssets(await assetsRes.json());
        else console.error("❌ Azure Assets Sync Failed:", await assetsRes.text());

        if (woRes.ok) setWorkOrders(await woRes.json());
        else console.error("❌ Azure Work Orders Sync Failed:", await woRes.text());

        if (templatesRes.ok) setPmTemplates(await templatesRes.json());
        else console.error("❌ Azure Templates Sync Failed:", await templatesRes.text());

        if (historyRes.ok) setHistory(await historyRes.json());
        else console.error("❌ Azure History Sync Failed:", await historyRes.text());
        
      } catch (err) {
        console.error("Critical Network Failure connecting to Azure:", err);
      }
    };

    fetchCosmosData();
  }, [currentUser, setUsers, setAssets, setWorkOrders, setPmTemplates, setHistory]); 
}