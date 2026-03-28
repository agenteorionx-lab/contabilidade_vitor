import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import Layout from './components/Layout';
import ResultadosMensais from './pages/ResultadosMensais';
import ResultadosAnuais from './pages/ResultadosAnuais';
import Lancamentos from './pages/Lancamentos';
import Cartoes from './pages/Cartoes';
import CadastroContas from './pages/CadastroContas';
import CadastroCartoes from './pages/CadastroCartoes';
import Dividas from './pages/Dividas';
import CustosFixos from './pages/CustosFixos';
import Config from './pages/Config';
import Acesso from './pages/Acesso';
import Membros from './pages/Membros';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes for Auth */}
        <Route path="/login/*" element={
          <SignedOut>
            <Login />
          </SignedOut>
        } />
        <Route path="/register/*" element={
          <SignedOut>
            <Register />
          </SignedOut>
        } />

        {/* Protected Dashboard Routes */}
        <Route path="/" element={
          <>
            <SignedIn>
              <Layout />
            </SignedIn>
            <SignedOut>
              <Navigate to="/login" replace />
            </SignedOut>
          </>
        }>
          <Route index element={<Navigate to="/mensal" replace />} />
          <Route path="mensal" element={<ResultadosMensais />} />
          <Route path="anual" element={<ResultadosAnuais />} />

          <Route path="cadastro">
            <Route path="contas" element={<CadastroContas />} />
            <Route path="cartoes" element={<CadastroCartoes />} />
          </Route>

          <Route path="lancamentos" element={<Lancamentos />} />
          <Route path="cartoes" element={<Cartoes />} />
          <Route path="dividas" element={<Dividas />} />
          <Route path="custos-fixos" element={<CustosFixos />} />
          <Route path="config" element={<Config />} />
          <Route path="membros" element={<Membros />} />
          <Route path="acesso/*" element={<Acesso />} />
        </Route>

        {/* Fallback to login if not signed in */}
        <Route path="*" element={
          <SignedOut>
            <RedirectToSignIn />
          </SignedOut>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
