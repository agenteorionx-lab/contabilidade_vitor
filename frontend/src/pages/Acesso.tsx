import { UserProfile, useUser } from "@clerk/clerk-react";

export default function Acesso() {
  const { user } = useUser();

  return (
    <div className="space-y-6">
      <div className="header-action glass-effect p-6 rounded-2xl border border-border">
        <div>
          <h1 className="text-2xl font-bold text-white">Controle de Acesso</h1>
          <p className="text-slate-400">Gerencie seu perfil e quem pode acessar o dashboard.</p>
        </div>
      </div>

      <div className="glass-effect p-6 rounded-2xl border border-border">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-white">Seu Perfil</h2>
          <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <img src={user?.imageUrl} alt={user?.fullName || ''} className="w-16 h-16 rounded-full border-2 border-primary" />
            <div>
              <p className="text-lg font-bold text-white">{user?.fullName}</p>
              <p className="text-slate-400">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-6 text-white">Configurações de Conta</h2>
          <div className="flex justify-center">
             <UserProfile routing="path" path="/acesso" />
          </div>
        </div>
      </div>
    </div>
  );
}
