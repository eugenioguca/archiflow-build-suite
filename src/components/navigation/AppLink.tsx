import { Link, type LinkProps } from "react-router-dom";
import * as React from "react";

type AppLinkProps =
  | ({ to: LinkProps["to"]; href?: never } & Omit<React.ComponentProps<typeof Link>, "to">)
  | ({ href: string; to?: never } & React.AnchorHTMLAttributes<HTMLAnchorElement>);

// Detecta externos (http/https), mailto, tel, hash absoluto, data:
const isExternalHref = (href: string) =>
  /^(https?:)?\/\//i.test(href) ||
  href.startsWith("mailto:") ||
  href.startsWith("tel:") ||
  href.startsWith("data:");

// Misma-origin con path absoluto "/…"
const isInternalHref = (href: string) =>
  href.startsWith("/") && !isExternalHref(href);

export function AppLink(props: AppLinkProps) {
  if ("href" in props) {
    const { href, ...rest } = props;
    if (href && isInternalHref(href) && !rest.target) {
      return <Link to={href} {...(rest as any)} />;
    }
    return <a href={href} {...rest} />;
  }
  // Ruta interna con `to`
  const { to, ...rest } = props as any;
  return <Link to={to} {...rest} />;
}
