
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import "quill/dist/quill.snow.css";
  import "./styles/globals.css";
  import "./styles/admin-consistency.css";
  import { applyAuthHeaders, setupAuthFetch } from "./utils/authHeaders";
  import { AreaProvider } from "./context/AreaContext.tsx";

  setupAuthFetch();
  applyAuthHeaders();

  createRoot(document.getElementById("root")!).render(
    <AreaProvider>
      <App />
    </AreaProvider>
  );
  