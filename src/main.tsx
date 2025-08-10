import ReactDOM from "react-dom/client";
import App from "./App";
import { Provider } from "./components/ui/provider";
import "./global.css";
import { attachConsole } from '@tauri-apps/plugin-log';

attachConsole().then(_=>{});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Provider>
    <App />
  </Provider>
);
