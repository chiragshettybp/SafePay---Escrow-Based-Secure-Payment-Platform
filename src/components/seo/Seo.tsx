import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export interface SeoProps {
  title: string;
  description?: string;
  canonicalPath?: string;
  noIndex?: boolean;
}

function upsertMeta(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
}

export function Seo({ title, description, canonicalPath, noIndex }: SeoProps) {
  const location = useLocation();

  useEffect(() => {
    const safeTitle = title.length > 60 ? title.slice(0, 57) + "..." : title;
    document.title = safeTitle;

    if (description) {
      const safeDescription =
        description.length > 160 ? description.slice(0, 157) + "..." : description;
      upsertMeta("description", safeDescription);
    }

    // Handle noIndex for admin pages
    if (noIndex) {
      upsertMeta("robots", "noindex, nofollow");
    } else {
      // Remove noindex if it was previously set
      const robotsMeta = document.querySelector('meta[name="robots"]');
      if (robotsMeta) {
        robotsMeta.remove();
      }
    }

    const canonicalUrl = `${window.location.origin}${canonicalPath ?? location.pathname}`;
    upsertCanonical(canonicalUrl);
  }, [title, description, canonicalPath, noIndex, location.pathname]);

  return null;
}
