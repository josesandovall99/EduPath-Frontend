
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import "quill/dist/quill.snow.css";
  import "./styles/admin-consistency.css";

  createRoot(document.getElementById("root")!).render(<App />);
  