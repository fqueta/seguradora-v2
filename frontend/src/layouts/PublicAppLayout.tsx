import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Store, ShoppingBag, ArrowLeft, LayoutDashboard, ListOrdered, User as UserIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { getInstitutionName } from "@/lib/branding";

type Props = {
  children: React.ReactNode;
  onCartClick?: () => void;
  onActionClick?: () => void;
  actionLabel?: string;
  cartCount?: number;
  cartTotal?: number;
  showBackButton?: boolean;
};

export default function PublicAppLayout({
  children,
  onCartClick,
  onActionClick,
  actionLabel,
  cartCount = 0,
  cartTotal = 0,
  showBackButton = false,
}: Props) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const location = useLocation();
  const isMenu = location.pathname === "/menu";
  const isCheckout = location.pathname === "/checkout";
  const instName = getInstitutionName() || "ZapDelivery";

  // check if user is admin/waiter (permission_id <= 4)
  const isAdmin = user && user.permission_id && Number(user.permission_id) <= 4;

  const handleCartClick = () => {
    if (onCartClick) {
      onCartClick();
    } else {
      navigate("/checkout");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Admin/Waiter Ribbon - Estilo Premium dark */}
      {isAdmin && (
        <div className="bg-slate-900 text-white text-[11px] sm:text-xs px-4 py-2 flex items-center justify-between sticky top-0 z-[50] shadow-md">
          <div className="flex items-center gap-4">
            <span className="font-black uppercase tracking-widest text-primary hidden xs:inline">Modo Atendimento</span>
            <div className="flex items-center gap-2 border-l border-white/10 pl-4 ml-1">
              <button 
                onClick={() => navigate("/admin/orders")} 
                className="flex items-center gap-1.5 hover:text-primary transition-colors font-bold"
              >
                <ListOrdered className="w-3.5 h-3.5" />
                Ver Pedidos
              </button>
              <button 
                onClick={() => navigate("/menu")} 
                className="flex items-center gap-1.5 hover:text-primary transition-colors font-bold ml-3"
              >
                <Store className="w-3.5 h-3.5" />
                Cardápio
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <span className="hidden sm:inline opacity-60 font-medium">Operador: {user.name}</span>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <button className="flex items-center gap-1.5 hover:text-primary transition-colors font-black">
                      <UserIcon className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline uppercase tracking-tighter">Minha Conta</span>
                   </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
                   <DropdownMenuLabel className="text-[10px] font-black uppercase text-gray-400">Gerenciamento</DropdownMenuLabel>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem onClick={() => navigate("/admin")} className="rounded-lg h-10 font-bold">
                      <LayoutDashboard className="mr-3 h-4 w-4 text-primary" />
                      Painel Administrativo
                   </DropdownMenuItem>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem onClick={() => logout()} className="text-red-600 rounded-lg h-10 font-bold">
                      <LogOut className="mr-3 h-4 w-4" />
                      Encerrar Sessão
                   </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
          </div>
        </div>
      )}

      {/* Mobile/Tablet Header Modernizado */}
      <header className={`sticky ${isAdmin ? 'top-[35px]' : 'top-0'} z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center justify-between lg:hidden shadow-sm transition-all`}>
        <div className="flex items-center gap-3">
          {showBackButton || !isMenu ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-gray-100"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <div className="h-10 w-10 flex items-center justify-center bg-primary/10 rounded-xl">
              <BrandLogo alt="Logo" className="h-6 w-auto" />
            </div>
          )}
          <h1 className="font-black text-lg tracking-tight text-gray-900">
            {isMenu ? "Cardápio" : isCheckout ? "Checkout" : instName}
          </h1>
        </div>
        
        {isMenu && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-11 w-11 rounded-2xl bg-gray-50 border border-gray-100"
            onClick={handleCartClick}
          >
            <ShoppingBag className="h-5 w-5 text-gray-700" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center ring-2 ring-white animate-in zoom-in">
                {cartCount}
              </span>
            )}
          </Button>
        )}
      </header>

      {/* Desktop Header Premium */}
      <header className={`sticky ${isAdmin ? 'top-[35px]' : 'top-0'} z-40 hidden lg:block border-b border-gray-100 bg-white/80 backdrop-blur-xl transition-all`}>
        <div className="mx-auto max-w-6xl px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate("/menu")}>
            <BrandLogo alt="Logo" className="h-10 w-auto" />
            <div className="h-8 w-px bg-gray-100 mx-2" />
            <div className="flex flex-col">
              <span className="text-sm font-black text-gray-900 leading-none">{instName}</span>
              <span className="text-[10px] uppercase font-bold text-primary tracking-[0.2em] mt-1">Order System</span>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              className={`h-11 px-6 rounded-2xl font-bold transition-all ${isMenu ? "bg-primary/5 text-primary" : "text-gray-500 hover:text-gray-900"}`}
              onClick={() => navigate("/menu")}
            >
              Cardápio
            </Button>
            <Button
              variant="ghost"
              className={`h-11 px-6 rounded-2xl font-bold transition-all ${isCheckout ? "bg-primary/5 text-primary" : "text-gray-500 hover:text-gray-900"}`}
              onClick={() => navigate("/checkout")}
            >
              Finalizar Pedido
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl p-4 sm:p-8 pb-32 lg:pb-12 animate-in fade-in duration-700">
        {children}
      </main>

      {/* Mobile/Tablet Header Secundário / Action Bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-100 p-4 lg:hidden pb-8 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="flex-col gap-1.5 h-auto py-2.5 px-3 rounded-2xl hover:bg-gray-50"
            onClick={() => navigate("/menu")}
          >
            <Store className={`h-6 w-6 ${isMenu ? "text-primary" : "text-gray-400"}`} />
            <span className={`text-[9px] font-black uppercase tracking-wider ${isMenu ? "text-primary" : "text-gray-500"}`}>Inicio</span>
          </Button>

          {actionLabel ? (
             <Button 
               className="flex-1 rounded-[1.5rem] shadow-xl shadow-primary/20 h-14 text-base font-black uppercase tracking-widest gap-3"
               onClick={onActionClick}
             >
               {actionLabel}
               {cartTotal > 0 && (
                 <Badge className="bg-white/20 text-white border-none font-black">
                    R$ {cartTotal.toFixed(2)}
                 </Badge>
               )}
             </Button>
          ) : (
            <Button 
              className="flex-1 rounded-[1.5rem] shadow-xl shadow-primary/20 h-14 text-base font-black uppercase tracking-widest relative px-6"
              onClick={handleCartClick}
            >
              <ShoppingBag className="mr-3 h-5 w-5" />
              Ver Sacola
              <div className="ml-auto flex items-center gap-3">
                <span className="h-6 w-px bg-white/20" />
                <span className="font-black">R$ {cartTotal.toFixed(2)}</span>
              </div>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
