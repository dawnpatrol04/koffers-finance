"use client";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/ui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const icons = {
  "/dashboard": () => <Icons.Overview size={20} />,
  "/dashboard/transactions": () => <Icons.Transactions size={20} />,
  "/dashboard/invoices": () => <Icons.Invoice size={20} />,
  "/dashboard/tracker": () => <Icons.Tracker size={20} />,
  "/dashboard/customers": () => <Icons.Customers size={20} />,
  "/dashboard/vault": () => <Icons.Vault size={20} />,
  "/dashboard/settings": () => <Icons.Settings size={20} />,
  "/dashboard/apps": () => <Icons.Apps size={20} />,
  "/dashboard/inbox": () => <Icons.Inbox2 size={20} />,
  "/dashboard/chat": () => <Icons.Chat size={20} />,
  "/dashboard/blog": () => <Icons.Blog size={20} />,
} as const;

const items = [
  {
    path: "/dashboard",
    name: "Overview",
  },
  {
    path: "/dashboard/inbox",
    name: "Inbox",
    children: [{ path: "/dashboard/inbox/settings", name: "Settings" }],
  },
  {
    path: "/dashboard/chat",
    name: "Chat",
  },
  {
    path: "/dashboard/blog",
    name: "Blog",
  },
  {
    path: "/dashboard/transactions",
    name: "Transactions",
    children: [
      {
        path: "/dashboard/transactions/categories",
        name: "Categories",
      },
      {
        path: "/dashboard/transactions?step=connect",
        name: "Connect bank",
      },
      {
        path: "/dashboard/transactions?step=import&hide=true",
        name: "Import",
      },
      { path: "/dashboard/transactions?createTransaction=true", name: "Create new" },
    ],
  },
  {
    path: "/dashboard/invoices",
    name: "Invoices",
    children: [
      { path: "/dashboard/invoices/products", name: "Products" },
      { path: "/dashboard/invoices?type=create", name: "Create new" },
    ],
  },
  {
    path: "/dashboard/tracker",
    name: "Tracker",
    children: [{ path: "/dashboard/tracker?create=true", name: "Create new" }],
  },
  {
    path: "/dashboard/customers",
    name: "Customers",
    children: [{ path: "/dashboard/customers?createCustomer=true", name: "Create new" }],
  },
  {
    path: "/dashboard/vault",
    name: "Vault",
  },
  {
    path: "/dashboard/apps",
    name: "Apps",
    children: [
      { path: "/dashboard/apps", name: "All" },
      { path: "/dashboard/apps?tab=installed", name: "Installed" },
    ],
  },
  {
    path: "/dashboard/settings",
    name: "Settings",
    children: [
      { path: "/dashboard/settings", name: "General" },
      { path: "/dashboard/settings/billing", name: "Billing" },
      { path: "/dashboard/settings/accounts", name: "Bank Connections" },
      { path: "/dashboard/settings/members", name: "Members" },
      { path: "/dashboard/settings/notifications", name: "Notifications" },
      { path: "/dashboard/settings/developer", name: "Developer" },
    ],
  },
];

interface ItemProps {
  item: {
    path: string;
    name: string;
    children?: { path: string; name: string }[];
  };
  isActive: boolean;
  isExpanded: boolean;
  isItemExpanded: boolean;
  onToggle: (path: string) => void;
  onSelect?: () => void;
}

const ChildItem = ({
  child,
  isActive,
  isExpanded,
  shouldShow,
  onSelect,
  index,
}: {
  child: { path: string; name: string };
  isActive: boolean;
  isExpanded: boolean;
  shouldShow: boolean;
  onSelect?: () => void;
  index: number;
}) => {
  const showChild = isExpanded && shouldShow;

  return (
    <Link
      prefetch
      href={child.path}
      onClick={() => onSelect?.()}
      className="block group/child"
    >
      <div className="relative">
        {/* Child item text */}
        <div
          className={cn(
            "ml-[35px] mr-[15px] h-[32px] flex items-center",
            "border-l border-[#DCDAD2] dark:border-[#2C2C2C] pl-3",
            "transition-all duration-200 ease-out",
            showChild
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-2",
          )}
          style={{
            transitionDelay: showChild
              ? `${40 + index * 20}ms`
              : `${index * 20}ms`,
          }}
        >
          <span
            className={cn(
              "text-xs font-medium transition-colors duration-200",
              "text-[#888] group-hover/child:text-primary",
              "whitespace-nowrap overflow-hidden",
              isActive && "text-primary",
            )}
          >
            {child.name}
          </span>
        </div>
      </div>
    </Link>
  );
};

const Item = ({
  item,
  isActive,
  isExpanded,
  isItemExpanded,
  onToggle,
  onSelect,
}: ItemProps) => {
  const Icon = icons[item.path as keyof typeof icons];
  const pathname = usePathname();
  const hasChildren = item.children && item.children.length > 0;

  // Children should be visible when: expanded sidebar AND this item is expanded
  const shouldShowChildren = isExpanded && isItemExpanded;

  const handleChevronClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle(item.path);
  };

  return (
    <div className="group">
      <Link
        prefetch
        href={item.path}
        onClick={() => onSelect?.()}
        className="group"
      >
        <div className="relative">
          {/* Background that expands */}
          <div
            className={cn(
              "border border-transparent h-[40px] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ml-[15px] mr-[15px]",
              isActive &&
                "bg-[#F2F1EF] dark:bg-secondary border-[#DCDAD2] dark:border-[#2C2C2C]",
              isExpanded ? "w-[calc(100%-30px)]" : "w-[40px]",
            )}
          />

          {/* Icon - always in same position from sidebar edge */}
          <div className="absolute top-0 left-[15px] w-[40px] h-[40px] flex items-center justify-center dark:text-[#666666] text-black group-hover:!text-primary pointer-events-none">
            <div className={cn(isActive && "dark:!text-white")}>
              <Icon />
            </div>
          </div>

          {isExpanded && (
            <div className="absolute top-0 left-[55px] right-[4px] h-[40px] flex items-center pointer-events-none">
              <span
                className={cn(
                  "text-sm font-medium transition-opacity duration-200 ease-in-out text-[#666] group-hover:text-primary",
                  "whitespace-nowrap overflow-hidden",
                  hasChildren ? "pr-2" : "",
                  isActive && "text-primary",
                )}
              >
                {item.name}
              </span>
              {hasChildren && (
                <button
                  type="button"
                  onClick={handleChevronClick}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center transition-all duration-200 ml-auto mr-3",
                    "text-[#888] hover:text-primary pointer-events-auto",
                    isActive && "text-primary/60",
                    shouldShowChildren && "rotate-180",
                  )}
                >
                  <Icons.ChevronDown size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Children */}
      {hasChildren && (
        <div
          className={cn(
            "transition-all duration-300 ease-out overflow-hidden",
            shouldShowChildren ? "max-h-96 mt-1" : "max-h-0",
          )}
        >
          {item.children!.map((child, index) => {
            const isChildActive = pathname === child.path;
            return (
              <ChildItem
                key={child.path}
                child={child}
                isActive={isChildActive}
                isExpanded={isExpanded}
                shouldShow={shouldShowChildren}
                onSelect={onSelect}
                index={index}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

type Props = {
  onSelect?: () => void;
  isExpanded?: boolean;
};

export function MainMenu({ onSelect, isExpanded = false }: Props) {
  const pathname = usePathname();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Reset expanded item when sidebar expands/collapses
  useEffect(() => {
    setExpandedItem(null);
  }, [isExpanded]);

  return (
    <div className="mt-6 w-full">
      <nav className="w-full">
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const isActive =
              pathname === item.path ||
              (pathname?.startsWith(item.path + "/") && item.path !== "/dashboard");

            return (
              <Item
                key={item.path}
                item={item}
                isActive={isActive}
                isExpanded={isExpanded}
                isItemExpanded={expandedItem === item.path}
                onToggle={(path) => {
                  setExpandedItem(expandedItem === path ? null : path);
                }}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      </nav>
    </div>
  );
}
