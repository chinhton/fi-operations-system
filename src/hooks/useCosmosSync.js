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
        // Fire all API requests in parallel for maximum speed
        const [usersRes, assetsRes, woRes, templatesRes, historyRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/assets'),
          fetch('/api/workorders'),
          fetch('/api/templates'),
          fetch('/api/history')
        ]);

        // Hydrate the state if the responses are good
        if (usersRes.ok) setUsers(await usersRes.json());
        if (assetsRes.ok) setAssets(await assetsRes.json());
        if (woRes.ok) setWorkOrders(await woRes.json());
        if (templatesRes.ok) setPmTemplates(await templatesRes.json());
        if (historyRes.ok) setHistory(await historyRes.json());
        
      } catch (err) {
        console.error("Failed to hydrate data from Azure Cosmos DB:", err);
      }
    };

    fetchCosmosData();
  }, [currentUser, setUsers, setAssets, setWorkOrders, setPmTemplates, setHistory]); 
}