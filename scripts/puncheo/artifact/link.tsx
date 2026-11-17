import type { ReactNode } from "react";
// In the artifact the three layouts are hash routes.
const route = (href: string) => (href.endsWith("legado-a") ? "#legado-a" : href.endsWith("legado-c") ? "#legado-c" : "#b");
export default function Link({ href, children, ...rest }: { href: string; children: ReactNode; [k: string]: unknown }) {
  return <a href={route(href)} {...rest}>{children}</a>;
}
