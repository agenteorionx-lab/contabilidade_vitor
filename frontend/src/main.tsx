import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import App from './App.tsx'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

console.log("Clerk Key Detected:", PUBLISHABLE_KEY ? "Yes (starts with " + PUBLISHABLE_KEY.substring(0, 10) + "...)" : "No");

const Root = () => {
  if (!PUBLISHABLE_KEY || !PUBLISHABLE_KEY.startsWith('pk_')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] text-white p-6 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Configuração de Autenticação</h1>
        <p className="max-w-md mb-6">
          Detectamos que a sua chave do Clerk está ausente ou é inválida no arquivo <code>.env</code>.
        </p>
        <div className="bg-slate-800 p-4 rounded-lg text-sm font-mono break-all mb-6 border border-slate-700">
          Chave atual: <span className="text-yellow-500">{PUBLISHABLE_KEY || "Vazia"}</span>
        </div>
        <p className="mb-8">
          Certifique-se de que o arquivo <code>frontend/.env</code> contém a linha:<br/>
          <code className="text-primary">VITE_CLERK_PUBLISHABLE_KEY=sua_chave_aqui</code>
        </p>
        <a href="https://dashboard.clerk.com" target="_blank" className="bg-primary hover:bg-blue-600 px-6 py-2 rounded-xl transition-colors">
          Ir para o Dashboard do Clerk
        </a>
      </div>
    )
  }

  return (
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY} 
      afterSignOutUrl="/"
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#3b82f6',
        }
      }}
    >
      <App />
    </ClerkProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
