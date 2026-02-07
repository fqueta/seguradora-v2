import { 
  ChevronUp, 
  ChevronDown, 
  User, 
  Wrench, 
  LogOut, 
  Settings, 
  LayoutDashboard,
  Menu,
  ChevronLeft
} from "lucide-react";
import * as React from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { buildMenuFromDTO, filterMenuByViewAccess, defaultMenu } from "@/lib/menu";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { getInstitutionName, hydrateBrandingFromPublicApi } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

/**
 * AppSidebar
 * pt-BR: Menu lateral premium com design moderno, animações suaves e branding refinado.
 * en-US: Premium sidebar with modern design, smooth animations, and refined branding.
 */
export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const { menu: apiMenu, logout, user } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const [institutionName, setInstitutionName] = React.useState(getInstitutionName());

  React.useEffect(() => {
    hydrateBrandingFromPublicApi().then(({ name }) => {
      if (name) setInstitutionName(name);
    });
  }, []);

  const rota_admin = 'admin';
  const resolveUrl = (url?: string): string => {
    if (!url || url === '#') return '#';
    const base = `/${rota_admin}`;
    if (url.startsWith(base)) return url;
    if (url.startsWith('/')) return `${base}${url}`;
    return `${base}/${url}`;
  };

  const GROUPS_KEY = 'sidebarGroupsCollapsed';
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(GROUPS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const getGroupKey = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const isGroupCollapsed = (title: string) => !!collapsedGroups[getGroupKey(title)];

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => {
      const key = getGroupKey(title);
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const baseMenu = apiMenu && apiMenu.length > 0 
    ? buildMenuFromDTO(apiMenu) 
    : buildMenuFromDTO(defaultMenu);

  const menuItems = filterMenuByViewAccess(baseMenu);

  const isActive = (path: string) => currentPath === resolveUrl(path);
  const hasActiveChild = (items: any[]) => 
    items?.some((item) => isActive(item.url));

  const groupKeys = menuItems.filter((i: any) => i.items)?.map((i: any) => getGroupKey(i.title)) ?? [];
  const areAllGroupsCollapsed = groupKeys.length > 0 && groupKeys.every((k) => !!collapsedGroups[k]);
  
  const collapseAllGroups = () => {
    setCollapsedGroups(groupKeys.reduce((acc, k) => ({ ...acc, [k]: true }), {}));
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groupKeys.reduce((acc, k) => ({ ...acc, [k]: true }), {})));
  };
  
  const expandAllGroups = () => {
    setCollapsedGroups({});
    localStorage.removeItem(GROUPS_KEY);
  };

  return (
    <Sidebar className={cn("border-r border-gray-100 transition-all duration-300", collapsed ? "w-20" : "w-72")} collapsible="icon">
      <SidebarRail />

      <SidebarHeader className="p-6 pb-2 print:hidden">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-3 overflow-hidden transition-all duration-300">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm border border-primary/10 group hover:scale-105 transition-transform">
              <BrandLogo alt="Logo" fallbackSrc="/aeroclube-logo.svg" className="h-6 w-auto group-hover:rotate-6 transition-transform" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-base font-black tracking-tight text-gray-900 truncate uppercase leading-none">{institutionName}</span>
                <span className="text-[10px] font-bold text-primary tracking-widest uppercase mt-1 opacity-80">Admin Panel</span>
              </div>
            )}
          </Link>
          {!collapsed && (
            <Button variant="ghost" size="icon" onClick={() => toggleSidebar()} className="h-8 w-8 rounded-xl text-gray-400 hover:bg-gray-50 flex lg:hidden">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-4 space-y-6">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 h-auto">
            {!collapsed ? "Navegação Principal" : "•"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <TooltipProvider delayDuration={0}>
              <SidebarMenu className="gap-1.5">
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.items ? (
                      <div className="space-y-1">
                        <Tooltip disableHoverableContent={!collapsed}>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton
                              isActive={hasActiveChild(item.items)}
                              onClick={() => !collapsed && toggleGroup(item.title)}
                              className={cn(
                                "h-12 rounded-2xl transition-all duration-200 font-bold text-gray-600 hover:bg-gray-50 group",
                                hasActiveChild(item.items) && "bg-primary/5 text-primary"
                              )}
                            >
                              <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", hasActiveChild(item.items) ? "text-primary" : "text-gray-400")} />
                              {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
                              {!collapsed && (
                                <div className="ml-auto transition-transform duration-300">
                                  {isGroupCollapsed(item.title) ? (
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                  ) : (
                                    <ChevronUp className="h-4 w-4 opacity-50" />
                                  )}
                                </div>
                              )}
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          {collapsed && <TooltipContent side="right" className="font-bold border-none shadow-xl rounded-xl px-4 py-2">{item.title}</TooltipContent>}
                        </Tooltip>

                        {!collapsed && !isGroupCollapsed(item.title) && (
                          <SidebarMenuSub className="ml-6 pl-4 border-l-2 border-gray-100 space-y-1 mt-1">
                            {item.items.map((subItem: any) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton 
                                  asChild 
                                  isActive={isActive(subItem.url)}
                                  className={cn(
                                    "h-10 rounded-xl font-bold text-sm text-gray-500 hover:text-gray-900 hover:bg-transparent transition-all",
                                    isActive(subItem.url) && "text-primary bg-primary/5 px-4"
                                  )}
                                >
                                  <NavLink to={resolveUrl(subItem.url)}>
                                    <span>{subItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        )}
                      </div>
                    ) : (
                      <Tooltip disableHoverableContent={!collapsed}>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton 
                            asChild 
                            isActive={isActive(item.url)}
                            className={cn(
                              "h-12 rounded-2xl transition-all duration-200 font-bold text-gray-600 hover:bg-gray-50 group",
                              isActive(item.url) && "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                            )}
                          >
                            <NavLink to={resolveUrl(item.url)}>
                              <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", isActive(item.url) ? "text-white" : "text-gray-400")} />
                              {!collapsed && <span>{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        {collapsed && <TooltipContent side="right" className="font-bold border-none shadow-xl rounded-xl px-4 py-2">{item.title}</TooltipContent>}
                      </Tooltip>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </TooltipProvider>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 mt-auto">
        <div className="bg-gray-50/50 rounded-[2.5rem] p-3 border border-gray-100/50 backdrop-blur-sm">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="h-16 rounded-[1.8rem] bg-white shadow-sm border border-gray-100 hover:bg-gray-50 hover:shadow-md transition-all p-2 group">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg shadow-primary/20">
                      {user?.name?.[0]?.toUpperCase() || <User className="h-6 w-6" />}
                    </div>
                    {!collapsed && (
                      <div className="flex flex-col ml-3 min-w-0">
                        <span className="text-sm font-black text-gray-900 truncate leading-none mb-1 text-left">{user?.name?.split(' ')[0]}</span>
                        <div className="flex items-center gap-1.5 opacity-60">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{user?.role_name || "Administrador"}</span>
                        </div>
                      </div>
                    )}
                    {!collapsed && <ChevronUp className="ml-auto h-4 w-4 text-gray-300 group-hover:text-gray-600 transition-colors mr-2" />}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="center" className="w-72 p-4 rounded-[2.5rem] shadow-2xl border-none animate-in slide-in-from-bottom-4 duration-500">
                  <DropdownMenuLabel className="px-4 pb-4 pt-2">
                    <div className="flex items-center gap-4 mb-4">
                       <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                          {user?.name?.[0]?.toUpperCase()}
                       </div>
                       <div className="flex flex-col">
                          <p className="text-lg font-black text-gray-900 leading-none">{user?.name}</p>
                          <p className="text-xs text-gray-400 font-medium mt-1">{user?.email}</p>
                       </div>
                    </div>
                    <Badge variant="outline" className="bg-gray-50 border-gray-100 text-[10px] font-black px-3 py-1 uppercase tracking-widest text-gray-400">
                       Conta Corporativa
                    </Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100 mb-2" />
                  <div className="space-y-1">
                    <DropdownMenuItem asChild className="rounded-2xl h-12 px-4 cursor-pointer">
                      <Link to="/admin/settings/user-profiles" className="flex items-center w-full">
                        <User className="mr-3 h-5 w-5 text-gray-400" />
                        <span className="font-bold">Perfil do Usuário</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-2xl h-12 px-4 cursor-pointer">
                      <Link to="/admin/settings/system" className="flex items-center w-full">
                        <Settings className="mr-3 h-5 w-5 text-gray-400" />
                        <span className="font-bold">Estatísticas & Painel</span>
                      </Link>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="bg-gray-100 my-2" />
                  <DropdownMenuItem onClick={logout} className="rounded-2xl h-12 px-4 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                    <LogOut className="mr-3 h-5 w-5" />
                    <span className="font-bold">Desconectar Sistema</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
          
          {!collapsed && (
            <div className="mt-4 px-3 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-gray-300">
               <button 
                onClick={() => (areAllGroupsCollapsed ? expandAllGroups() : collapseAllGroups())}
                className="hover:text-primary transition-colors flex items-center gap-2 group/btn"
               >
                 <ChevronDown className={cn("w-3 h-3 group-hover/btn:rotate-180 transition-transform", areAllGroupsCollapsed && "rotate-180")} />
                 {areAllGroupsCollapsed ? "Expandir Menu" : "Recolher Menu"}
               </button>
               <span className="opacity-40">v2.1.4</span>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}