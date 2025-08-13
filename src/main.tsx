import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { serviceWorkerManager } from './utils/serviceWorkerManager'

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for background updates
serviceWorkerManager.register().then((registered) => {
  if (registered) {
    console.log('✅ Push-based update system activated');
    // Request push notification permission
    serviceWorkerManager.requestPushPermission();
  }
});
