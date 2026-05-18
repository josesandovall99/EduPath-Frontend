
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import "./styles/globals.css";
  // admin-consistency.css y quill.snow.css se importan en los componentes autenticados
  // (lazy-loaded) para no cargarlos en la pantalla de login → mejora FCP/LCP.
  import { applyAuthHeaders, setupAuthFetch } from "./utils/authHeaders";
  import { AreaProvider } from "./context/AreaContext.tsx";

  setupAuthFetch();
  applyAuthHeaders();

  createRoot(document.getElementById("root")!).render(
    <AreaProvider>
      <App />
    </AreaProvider>
  );
  