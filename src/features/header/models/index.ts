export interface HeaderNavLink {
  id: number;
  label: string;
  url: string;
  isExternal: boolean | null;
}

export interface HeaderData {
  id: number;
  documentId?: string;
  logoText: string;
  logDisplay: string;
  logoSVG: string | null;
  showSearch: boolean;
  showFavIcon: boolean;
  showCart: boolean;
  showProfileIcon: boolean;
  navLinks: HeaderNavLink[];
}
