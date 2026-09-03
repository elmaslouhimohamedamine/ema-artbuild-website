import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

// Empêche le navigateur de restaurer une ancienne position de scroll
if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

// Toujours commencer la page à 0 au premier chargement
window.scrollTo(0, 0);

// Supprime un éventuel hash ancien comme #contact
if (window.location.hash) {
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
