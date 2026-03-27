import React from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  return <div style={{ color: 'white', background: '#020617', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Agent Workspace</div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
