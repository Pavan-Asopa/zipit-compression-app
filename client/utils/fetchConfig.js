// function to fetch backend API URL from config file
export async function fetchConfig() {
  const response = await fetch("/config.json");
  const config = await response.json();
  return config.backendAPI; // return the value associated with the key: backendAPI
}
