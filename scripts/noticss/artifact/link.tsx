import type { ReactNode } from "react";
const route = (href: string) => (href.endsWith("/b") ? "#b" : "#a");
export default function Link({ href, children, ...rest }: { href: string; children: ReactNode; [k: string]: unknown }) {
  return <a href={route(href)} {...rest}>{children}</a>;
}
