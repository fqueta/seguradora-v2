import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { 
  Bell, 
  Search, 
  LogOut, 
  Sun, 
  Moon, 
  Loader2, 
  User, 
  Command,
  Settings,
  ShieldCheck,
  Zap,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import commentsService from "@/services/commentsService";
import { useToast } from "@/components/ui/use-toast";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { getInstitutionName, hydrateBrandingFromPublicApi } from "@/lib/branding";
import { FindBeneficiaryModal } from "../clients/FindBeneficiaryModal";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * AppLayout
 * pt-BR: Shell global moderno com design premium, header dinâmico e Command Palette integrador.
 * en-US: Global shell with premium design, dynamic header, and integrated Command Palette.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const { prefs, setPref } = useUserPrefs();
  const { applyThemeSettings } = useTheme();
  const navigate = useNavigate();
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [beneficiaryModalOpen, setBeneficiaryModalOpen] = React.useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [institutionName, setInstitutionName] = React.useState(getInstitutionName());

  React.useEffect(() => {
    hydrateBrandingFromPublicApi().then(({ name }) => {
      if (name) setInstitutionName(name);
    });
  }, []);

  // Shortcut for Command Palette
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const pendingCommentsQuery = useQuery({
    queryKey: ["admin-pending-comments"],
    queryFn: async () => {
      return { items: [], total: 0 };
    },
    enabled: false,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const bellApproveMutation = useMutation({
    mutationFn: async (id: number | string) => commentsService.adminApprove(id),
    onSuccess: () => {
      try { qc.invalidateQueries({ queryKey: ["admin-pending-comments"] }); } catch {}
      pendingCommentsQuery.refetch();
      toast({ title: "Comentário aprovado" });
    },
    onError: () => toast({ title: "Falha ao aprovar", variant: "destructive" } as any),
  });

  const bellRejectMutation = useMutation({
    mutationFn: async (id: number | string) => commentsService.adminReject(id),
    onSuccess: () => {
      try { qc.invalidateQueries({ queryKey: ["admin-pending-comments"] }); } catch {}
      pendingCommentsQuery.refetch();
      toast({ title: "Comentário rejeitado" });
    },
    onError: () => toast({ title: "Falha ao rejeitar", variant: "destructive" } as any),
  });

  const handleLogout = async () => {
    await logout();
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const toggleTheme = () => {
    try {
      const saved = localStorage.getItem("appearanceSettings");
      const current = saved ? JSON.parse(saved) : { darkMode: false };
      const next = { ...current, darkMode: !current.darkMode };
      localStorage.setItem("appearanceSettings", JSON.stringify(next));
      applyThemeSettings();
    } catch (e) {
      console.warn("Falha ao alternar tema:", e);
    }
  };

  return (
    <SidebarProvider 
      open={prefs.sidebarOpen} 
      onOpenChange={(open) => setPref('sidebarOpen', open)}
    >
      <div className="min-h-screen flex w-full bg-gray-50/30">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header Premium */}
          <header className="sticky top-0 z-40 h-20 border-b border-gray-100 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 flex items-center justify-between px-6 lg:px-10 transition-all">
            <div className="flex items-center gap-6">
              <SidebarTrigger className="h-10 w-10 rounded-xl hover:bg-gray-100" />
              
              <div className="hidden xl:flex items-center gap-4">
                <div className="h-8 w-px bg-gray-100" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                      Acesso Administrador
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 mt-0.5 leading-tight">{institutionName}</span>
                </div>
              </div>

              {/* Quick Search Button */}
              <Button 
                variant="outline" 
                onClick={() => setCmdOpen(true)}
                className="hidden md:flex items-center gap-3 h-11 px-4 rounded-2xl bg-gray-50/50 border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-all w-64 justify-start text-gray-400 group"
              >
                <Search className="h-4 w-4 group-hover:text-primary transition-colors" />
                <span className="text-xs font-bold flex-1 text-left">Busca rápida...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTheme} 
                className="h-11 w-11 rounded-2xl hover:bg-gray-100 text-gray-500"
              >
                <Sun className="h-5 w-5 dark:hidden" />
                <Moon className="h-5 w-5 hidden dark:block" />
              </Button>

              {/* Notifications */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl hover:bg-gray-100 text-gray-500 relative">
                    <Bell className="h-5 w-5" />
                    {Number(pendingCommentsQuery.data?.total || 0) > 0 && (
                      <span className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                        {Math.min(99, Number(pendingCommentsQuery.data?.total || 0))}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0 rounded-[2rem] shadow-2xl border-none overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-gray-50 p-4 border-b border-gray-100">
                    <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Central de Notificações</p>
                  </div>
                  <div className="p-4 bg-white min-h-[100px] flex items-center justify-center">
                    <div className="text-center">
                       <Zap className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                       <p className="text-sm font-bold text-gray-400">Sem novas notificações</p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="h-8 w-px bg-gray-100 mx-2" />
              
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-3 h-14 pl-2 pr-4 rounded-3xl hover:bg-gray-50 transition-all group">
                    <Avatar className="h-10 w-10 rounded-2xl ring-2 ring-white shadow-md group-hover:scale-105 transition-transform">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="bg-primary text-white font-black">
                        {user?.name ? getUserInitials(user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left hidden sm:block">
                      <div className="text-xs font-black text-gray-900 leading-none mb-1">{user?.name}</div>
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest py-0 h-4 border-gray-200 text-gray-400 bg-gray-50 group-hover:bg-primary/5 transition-colors">
                        {user?.role_name || 'Usuário'}
                      </Badge>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-3 rounded-[2rem] shadow-2xl border-none">
                  <DropdownMenuLabel className="px-4 py-3">
                    <p className="text-xs font-black uppercase text-gray-400 tracking-widest mb-1">Acesso Rápido</p>
                    <p className="font-black text-gray-900">{user?.name}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100 mx-2" />
                  <div className="p-1 space-y-1">
                    <DropdownMenuItem onClick={() => navigate('/admin/settings/user-profiles')} className="rounded-2xl h-11 cursor-pointer">
                      <User className="mr-3 h-5 w-5 text-gray-400" />
                      <span className="font-bold">Meu Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={toggleTheme} className="rounded-2xl h-11 cursor-pointer">
                      <Zap className="mr-3 h-5 w-5 text-gray-400" />
                      <span className="font-bold">Alternar Tema</span>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="bg-gray-100 mx-2" />
                  <DropdownMenuItem onClick={handleLogout} className="rounded-2xl h-11 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 m-1">
                    <LogOut className="mr-3 h-5 w-5" />
                    <span className="font-bold">Encerrar Sessão</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Conteúdo Principal com Scroll Suave */}
          <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10 lg:py-12 flex flex-col items-center">
            <div className="w-full max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
              {children}
            </div>
          </main>

          {/* Command Palette Modernizado */}
          <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
            <div className="p-3 border-b bg-gray-50/50">
               <CommandInput placeholder="Digite para buscar ferramentas, páginas ou ações..." className="h-12 border-none bg-transparent" />
            </div>
            <CommandList className="max-h-[450px] p-2">
              <CommandEmpty className="p-10 text-center">
                 <Search className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                 <p className="font-bold text-gray-400">Nenhum resultado encontrado.</p>
              </CommandEmpty>
              
              <CommandGroup heading="Navegação Direta" className="px-3 py-2">
                <CommandItem onSelect={() => { setCmdOpen(false); navigate('/admin/dashboard'); }} className="rounded-xl h-12 mb-1 px-3">
                  <LayoutDashboard className="mr-3 h-5 w-5 text-primary" />
                  <span className="font-bold">Dashboard de Operações</span>
                </CommandItem>
                <CommandItem onSelect={() => { setCmdOpen(false); navigate('/admin/clients'); }} className="rounded-xl h-12 mb-1 px-3">
                  <User className="mr-3 h-5 w-5 text-blue-500" />
                  <span className="font-bold">Gestão de Clientes</span>
                </CommandItem>
                <CommandItem onSelect={() => { setCmdOpen(false); navigate('/admin/orders'); }} className="rounded-xl h-12 mb-1 px-3">
                  <Zap className="mr-3 h-5 w-5 text-orange-500" />
                  <span className="font-bold">Gerenciador de Pedidos</span>
                </CommandItem>
                <CommandItem onSelect={() => { setCmdOpen(false); navigate('/admin/products'); }} className="rounded-xl h-12 mb-1 px-3">
                  <Zap className="mr-3 h-5 w-5 text-emerald-500" />
                  <span className="font-bold">Catálogo de Produtos</span>
                </CommandItem>
              </CommandGroup>
              
              <CommandSeparator className="bg-gray-100 my-2" />
              
              <CommandGroup heading="Configurações & Sistema" className="px-3 py-2">
                <CommandItem onSelect={() => { toggleTheme(); }} className="rounded-xl h-12 mb-1 px-3">
                  <Sun className="mr-3 h-5 w-5 text-yellow-500" />
                  <span className="font-bold">Mudar Aparência (Dark/Light)</span>
                </CommandItem>
                <CommandItem onSelect={() => { setCmdOpen(false); navigate('/admin/settings/system'); }} className="rounded-xl h-12 mb-1 px-3">
                  <Settings className="mr-3 h-5 w-5 text-gray-400" />
                  <span className="font-bold">Configurações Gerais</span>
                </CommandItem>
                <CommandItem onSelect={() => { setCmdOpen(false); handleLogout(); }} className="rounded-xl h-12 mb-1 px-3 text-red-600 focus:bg-red-50 focus:text-red-600">
                  <LogOut className="mr-3 h-5 w-5" />
                  <span className="font-bold">Finalizar Expediente (Sair)</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
            <div className="p-3 border-t bg-gray-50/50 flex justify-end gap-1">
               <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-muted-foreground">esc</kbd>
               <span className="text-[10px] font-bold text-gray-400 uppercase">para fechar</span>
            </div>
          </CommandDialog>
          
          <FindBeneficiaryModal 
            open={beneficiaryModalOpen} 
            onOpenChange={setBeneficiaryModalOpen} 
          />
        </div>
      </div>
    </SidebarProvider>
  );
}