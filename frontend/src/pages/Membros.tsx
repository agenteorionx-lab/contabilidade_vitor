import { OrganizationProfile } from '@clerk/clerk-react';
import { Users } from 'lucide-react';

const Membros = () => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/20 rounded-xl text-primary">
                    <Users size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Gestão de Equipe e Sócios</h1>
                    <p className="text-slate-400 mt-1">
                        Convide membros, atribua cargos e gerencie o acesso a esta organização.
                    </p>
                </div>
            </div>

            <div className="bg-card/50 border border-border rounded-2xl p-6 backdrop-blur-sm min-h-[600px] flex justify-center">
                <OrganizationProfile 
                    appearance={{
                        elements: {
                            rootBox: "w-full shadow-none",
                            card: "bg-transparent shadow-none w-full max-w-none text-slate-200",
                            navbar: "hidden", // We can hide the internal navbar if we just want the members list, or keep it.
                            headerTitle: "text-slate-100",
                            headerSubtitle: "text-slate-400",
                            profileSectionTitle: "text-slate-200 border-b border-slate-800 pb-2",
                            profileSectionTitleText: "text-lg font-bold text-primary",
                            profileSectionContent: "text-slate-300",
                            formButtonPrimary: "bg-primary hover:bg-primary/90 text-white",
                            formFieldInput: "bg-slate-900 border-slate-700 text-white focus:border-primary",
                            userPreviewMainIdentifier: "text-slate-200",
                            userPreviewSecondaryIdentifier: "text-slate-400",
                            badge: "bg-slate-800 text-slate-300 border border-slate-700",
                            tableHead: "text-slate-400 border-b border-slate-800",
                            tableRow: "border-b border-slate-800 hover:bg-slate-800/50",
                            tableCell: "text-slate-300",
                            selectButton: "bg-slate-900 border border-slate-700 text-white",
                            menuButton: "text-slate-300 hover:text-white",
                            menuList: "bg-slate-900 border border-slate-800",
                            menuItem: "hover:bg-slate-800 text-slate-300",
                            avatarBox: "border-2 border-slate-800",
                            popoverContent: "bg-slate-900 border border-slate-800 shadow-xl",
                            popoverFooter: "bg-slate-900 border-t border-slate-800",
                        }
                    }}
                />
            </div>
        </div>
    );
};

export default Membros;
