import type { ReactNode } from "react";
// In the artifact the three layouts are hash routes.
const route = (href: string) => (href.endsWith("/b") ? "#b" : href.endsWith("/c") ? "#c" : "#a");
export default function Link({ href, children, ...rest }: { href: string; children: ReactNode; [k: string]: unknown }) {
  return <a href={route(href)} {...rest}>{children}</a>;
}
