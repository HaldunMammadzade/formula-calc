import { useQuery } from "@tanstack/react-query";


const fetchSuggestions = async (query: string) => {
  if (!query.trim()) return [];

  const response = await fetch("https://652f91320b8d8ddac0b2b62b.mockapi.io/autocomplete");
  if (!response.ok) throw new Error("Failed to fetch data");

  const data = await response.json();

  const filteredData = data.filter(
    (item: { name: string; category: string }) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  return filteredData;
};

export const useAutocomplete = (query: string) => {
  const queryResult = useQuery({
    queryKey: ["autocomplete", query], 
    queryFn: () => fetchSuggestions(query),
    enabled: query.trim().length > 0,
    staleTime: 5000, 
    // cacheTime: 10000, 
    refetchOnWindowFocus: false, 
  });



  return queryResult;
};
