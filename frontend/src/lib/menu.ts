import {
  Home,
  Users,
  Wrench,
  Package,
  FileText,
  ClipboardList,
  DollarSign,
  BarChart3,
  Settings,
  Building,
  LucideIcon,
} from "lucide-react";
import { MenuItemDTO, MenuItemResolved } from "@/types/menu";

// Icon map for resolving string icon names to components
export const iconMap: Record<string, LucideIcon> = {
  Home,
  Users,
  Wrench,
  Package,
  FileText,
  ClipboardList,
  DollarSign,
  BarChart3,
  Settings,
  Building,
};

// Helper to check if can_view is truthy (considers 1, '1', true as truthy)
export function isCanViewTruthy(canView?: boolean | number | '0' | '1'): boolean {
  if (canView === undefined || canView === null) return false;
  if (typeof canView === 'boolean') return canView;
  if (typeof canView === 'number') return canView === 1;
  if (typeof canView === 'string') return canView === '1';
  return false;
}

// Resolve menu DTOs to menu items with actual icon components
export function buildMenuFromDTO(menuDTO: MenuItemDTO[]): MenuItemResolved[] {
  return menuDTO.map((item) => ({
    ...item,
    id: item.id,
    parent_id: item.parent_id,
    icon: iconMap[item.icon || ""] || FileText, // fallback to FileText
    can_view: item.can_view,
    items: item.items ? buildMenuFromDTO(item.items) : undefined,
  }));
}

// Find menu item by URL path
export function findMenuItemByUrl(menu: MenuItemDTO[], url: string): MenuItemDTO | undefined {
  for (const item of menu) {
    if (item.url === url) {
      return item;
    }
    if (item.items) {
      const found = findMenuItemByUrl(item.items, url);
      if (found) return found;
    }
  }
  return undefined;
}

// Default menu structure when no menu is provided by API
export const defaultMenu: MenuItemDTO[] = [
  {
    title: "Início",
    url: "/admin/dashboard",
    icon: "Home",
    permission: "dashboard.view",
    can_view: true
  },
  {
    title: "Gestão de Pedidos",
    icon: "ClipboardList",
    permission: "orders.view",
    can_view: true,
    items: [
      {
        title: "Listagem de Pedidos",
        url: "/admin/orders",
        permission: "orders.view",
        can_view: true
      },
      {
        title: "Painel Kanban",
        url: "/admin/orders/kanban",
        permission: "orders.view",
        can_view: true
      },
      {
        title: "Novo Pedido",
        url: "/admin/orders/create",
        permission: "orders.create",
        can_view: true
      }
    ]
  },

  {
    title: "Cardápio (Site)",
    url: "/menu",
    icon: "Package",
    permission: "menu.view",
    can_view: true
  },
  {
    title: "Catálogo",
    icon: "Package",
    permission: "catalog.view",
    can_view: true,
    items: [
      {
        title: "Produtos",
        url: "/admin/products",
        permission: "catalog.products.view",
        can_view: true
      },
      {
        title: "Categorias",
        url: "/admin/categories",
        permission: "catalog.categories.view",
        can_view: true
      }
    ]
  },
  {
    title: "Clientes",
    url: "/admin/clients",
    icon: "Users",
    permission: "clients.view",
    can_view: true
  },
  {
    title: "Relatórios",
    icon: "BarChart3",
    permission: "reports.view",
    can_view: true,
    items: [
      {
        title: "Fechamento de Caixa",
        url: "/admin/reports/closing",
        permission: "reports.closing.view",
        can_view: true
      },
      {
        title: "Relatório Geral",
        url: "/admin/reports/relatorio-geral",
        permission: "reports.general.view",
        can_view: true
      }
    ]
  },
  {
    title: "Configurações",
    icon: "Settings",
    permission: "settings.view",
    can_view: true,
    items: [
      {
        title: "Usuários",
        url: "/admin/settings/users",
        permission: "settings.users.view",
        can_view: true
      },
      {
        title: "Sistema",
        url: "/admin/settings/system",
        permission: "settings.system.view",
        can_view: true
      }
    ]
  }
];


// Filter menu based on can_view access (can_view undefined = invisible by default)
export function filterMenuByViewAccess(menu: MenuItemResolved[]): MenuItemResolved[] {
  return menu
    .map((item) => {
      // If item has subitems, filter them recursively first
      let filteredItems: MenuItemResolved[] | undefined;
      if (item.items) {
        filteredItems = filterMenuByViewAccess(item.items);
      }

      // Item is visible if:
      // 1. Its can_view is truthy OR
      // 2. It has visible children (even if its own can_view is falsy/undefined)
      const hasVisibleChildren = filteredItems && filteredItems.length > 0;
      const isItemVisible = isCanViewTruthy(item.can_view) || hasVisibleChildren;

      if (!isItemVisible) {
        return null;
      }

      return {
        ...item,
        items: filteredItems,
      };
    })
    .filter((item) => item !== null) as MenuItemResolved[];
}
