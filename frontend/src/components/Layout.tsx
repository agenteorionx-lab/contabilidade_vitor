import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { UserButton, useUser } from '@clerk/clerk-react';
import { useStore } from '../store/useStore';
import {
    ArrowRightLeft,
    CreditCard,
    TrendingUp,
    ReceiptEuro,
    Settings,
    Menu,
    X,
    PieChart,
    Home,
    ChevronDown,
    ChevronUp,
    LayoutDashboard,
    FolderPlus,
    Landmark,
    WalletCards,
    Lock
} from 'lucide-react';

const Layout = () => {
    const [isOpen, setIsOpen] = useState(true);
    const { user, isLoaded } = useUser();
    const initializeFromCloud = useStore(state => state.initializeFromCloud);
    const clearState = useStore(state => state.clearState);
    const setUserId = useStore(state => state.setUserId);

    useEffect(() => {
        if (isLoaded) {
            if (user) {
                setUserId(user.id);
                initializeFromCloud(user.id);
            } else {
                setUserId(null);
                clearState();
            }
        }
    }, [user, isLoaded, initializeFromCloud, clearState, setUserId]);

    // Suporte para múltiplos menus retráteis
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        'Dashboard': true,
        'Cadastro': true
    });

    const toggleMenu = (name: string) => {
        setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const navItems = [
        {
            name: 'Dashboard',
            icon: <LayoutDashboard size={20} />,
            path: '#',
            children: [
                { name: 'Resultados Mensais', icon: <PieChart size={18} />, path: '/mensal' },
                { name: 'Resultados Anuais', icon: <TrendingUp size={18} />, path: '/anual' },
            ]
        },
        {
            name: 'Cadastro',
            icon: <FolderPlus size={20} />,
            path: '#',
            children: [
                { name: 'Cartões de Crédito', icon: <CreditCard size={18} />, path: '/cadastro/cartoes' },
                { name: 'Contas Bancárias', icon: <Landmark size={18} />, path: '/cadastro/contas' },
                { name: 'Custos Fixos', icon: <Home size={18} />, path: '/custos-fixos' },
            ]
        },
        // Itens independentes focados em input de dados
        { name: 'Lançamentos (Contas)', icon: <ArrowRightLeft size={20} />, path: '/lancamentos' },
        { name: 'Lançamentos (Cartão)', icon: <WalletCards size={20} />, path: '/cartoes' },
        { name: 'Dívidas', icon: <ReceiptEuro size={20} />, path: '/dividas' },
        { name: 'Configurações', icon: <Settings size={20} />, path: '/config' },
        { name: 'Controle de Acesso', icon: <Lock size={20} />, path: '/acesso' },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-background text-slate-200">

            {/* Sidebar */}
            <aside className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-card/95 backdrop-blur-md border-r border-border transition-transform lg:static lg:translate-x-0`}>
                <div className="flex items-center justify-center h-24 border-b border-border relative px-4 text-center">
                    <img src="/logo.png" alt="OrionX Logo" className="h-20 w-auto object-contain" />
                    <button onClick={() => setIsOpen(false)} className="lg:hidden absolute right-4">
                        <X size={24} />
                    </button>
                </div>

                <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-4rem)]">
                    {navItems.map((item) => {
                        if (item.children) {
                            const isMenuOpen = openMenus[item.name];
                            return (
                                <div key={item.name} className="space-y-1 relative before:absolute before:left-4 before:top-12 before:-bottom-2 before:w-[2px] before:bg-slate-800">
                                    <button
                                        onClick={() => toggleMenu(item.name)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-slate-300 hover:bg-slate-800 hover:text-white font-semibold`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {item.icon}
                                            <span>{item.name}</span>
                                        </div>
                                        {isMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>

                                    {isMenuOpen && (
                                        <div className="pl-6 space-y-1 mt-1 relative">
                                            {item.children.map((child) => (
                                                <NavLink
                                                    key={child.path}
                                                    to={child.path}
                                                    onClick={() => { if (window.innerWidth < 1024) setIsOpen(false) }}
                                                    className={({ isActive }) =>
                                                        `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all relative ${isActive
                                                            ? 'bg-primary/20 text-primary font-bold border border-primary/30 shadow-lg shadow-primary/10'
                                                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                                        }`
                                                    }
                                                >
                                                    {child.icon}
                                                    <span className="text-sm">{child.name}</span>
                                                </NavLink>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path!}
                                onClick={() => { if (window.innerWidth < 1024) setIsOpen(false) }}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${isActive
                                        ? 'bg-primary/20 text-primary border border-primary/30 shadow-lg shadow-primary/10'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`
                                }
                            >
                                {item.icon}
                                <span>{item.name}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className="h-16 flex items-center justify-between px-6 bg-background/80 backdrop-blur-md border-b border-border z-40 sticky top-0">
                    <button onClick={() => setIsOpen(true)} className="lg:hidden text-slate-400 hover:text-white transition-colors">
                        <Menu size={24} />
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        <div className="flex items-center gap-2 bg-card pl-4 pr-1 py-1 rounded-full border border-border cursor-pointer hover:bg-slate-800 transition-colors">
                            <span className="font-medium text-sm hidden sm:block">{user?.fullName || user?.primaryEmailAddress?.emailAddress}</span>
                            <UserButton />
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-6 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background relative">
                    <Outlet />
                </div>
            </main>

            {/* Overlay for mobile sidebar */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                />
            )}
        </div>
    );
};

export default Layout;
