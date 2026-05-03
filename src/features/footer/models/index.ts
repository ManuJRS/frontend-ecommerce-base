export interface FooterLinkItem {
  id: number;
  title: string;
  link: string;
}

export interface FooterColumn {
  id: number;
  footerColumnTitle: string;
  footerLink: FooterLinkItem[];
}

export interface FooterNewsletter {
  id?: number;
  newslleterTitle: string;
  newslleterInputText: string;
  newslleterAdvice: string;
  showNewslleter: boolean;
}

export interface FooterMap {
  id?: number;
  showMap: boolean;
  title: string;
  advice: string;
  iframe: string;
}

export interface FooterSocialIcon {
  id: number;
  link: string;
  /** URL del SVG en CDN o objeto Strapi media */
  svgUrl: string | null;
}

export interface FooterSocialBlock {
  singTitle: string;
  icons: FooterSocialIcon[];
}

export interface FooterData {
  id: number;
  documentId?: string;
  logoText: string;
  logDisplay: string;
  footerText: string;
  logoSvgUrl: string | null;
  column: FooterColumn[];
  newslleter: FooterNewsletter | null;
  map: FooterMap | null;
  socialMedia: FooterSocialBlock | null;
}
