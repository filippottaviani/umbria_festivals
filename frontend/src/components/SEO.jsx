import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_BASE_URL = 'https://sagraumbra.it';
const DEFAULT_TITLE = 'Sagra Umbra — Portale Sagre, Feste & Tradizioni dei Borghi Umbri';
const DEFAULT_DESC = 'Scopri le sagre e gli eventi enogastronomici autentici nei borghi dell\'Umbria: sapori tradizionali, date, mappe, programmi e menù completi.';
const DEFAULT_IMAGE = `${DEFAULT_BASE_URL}/icon.svg`;

/**
 * Reusable SEO component for managing title, meta tags, Open Graph, Twitter Cards,
 * canonical links, and Schema.org JSON-LD structured data.
 *
 * Implements guidelines from skills/marketing-skills/skills/seo:
 * - title-tag: ~50-60 chars, front-loaded, keyword near start
 * - meta-description: ~150-160 chars, CTR focused
 * - canonical-tag: self-referencing absolute canonical
 * - open-graph & twitter-cards: summary_large_image + 1200x630 OG image
 * - schema-markup: valid JSON-LD
 */
export default function SEO({
    title,
    description = DEFAULT_DESC,
    image,
    canonical,
    type = 'website',
    robots = 'index, follow',
    schema = null,
}) {
    const location = useLocation();
    const siteUrl = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : DEFAULT_BASE_URL;
    const currentUrl = canonical || `${siteUrl}${location.pathname}`;

    // Format title according to title-tag best practice
    let fullTitle = title ? `${title} | Sagra Umbra` : DEFAULT_TITLE;
    if (title && (title.includes('Sagra Umbra') || title.includes('SagraUmbra'))) {
        fullTitle = title;
    }

    const ogImage = image
        ? (image.startsWith('http') ? image : `${siteUrl}${image}`)
        : DEFAULT_IMAGE;

    useEffect(() => {
        // 1. Update Document Title
        document.title = fullTitle;

        // Helper to get or create tag in <head>
        const setMetaTag = (attrName, attrValue, content) => {
            if (!content) return;
            let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(attrName, attrValue);
                document.head.appendChild(el);
            }
            el.setAttribute('content', content);
        };

        const setLinkTag = (rel, href) => {
            if (!href) return;
            let el = document.querySelector(`link[rel="${rel}"]`);
            if (!el) {
                el = document.createElement('link');
                el.setAttribute('rel', rel);
                document.head.appendChild(el);
            }
            el.setAttribute('href', href);
        };

        // 2. Standard Meta Tags
        setMetaTag('name', 'description', description);
        setMetaTag('name', 'robots', robots);

        // 3. Canonical Tag
        setLinkTag('canonical', currentUrl);

        // 4. Open Graph Tags
        setMetaTag('property', 'og:title', fullTitle);
        setMetaTag('property', 'og:description', description);
        setMetaTag('property', 'og:image', ogImage);
        setMetaTag('property', 'og:url', currentUrl);
        setMetaTag('property', 'og:type', type);
        setMetaTag('property', 'og:locale', 'it_IT');
        setMetaTag('property', 'og:site_name', 'Sagra Umbra');

        // 5. Twitter Card Tags
        setMetaTag('name', 'twitter:card', 'summary_large_image');
        setMetaTag('name', 'twitter:title', fullTitle);
        setMetaTag('name', 'twitter:description', description);
        setMetaTag('name', 'twitter:image', ogImage);

        // 6. Structured Data (JSON-LD)
        const SCRIPT_ID = 'seo-structured-data';
        let scriptEl = document.getElementById(SCRIPT_ID);

        if (schema) {
            const schemaData = Array.isArray(schema) ? schema : [schema];
            const structuredDataText = JSON.stringify(schemaData.length === 1 ? schemaData[0] : schemaData);

            if (!scriptEl) {
                scriptEl = document.createElement('script');
                scriptEl.id = SCRIPT_ID;
                scriptEl.type = 'application/ld+json';
                document.head.appendChild(scriptEl);
            }
            scriptEl.textContent = structuredDataText;
        } else if (scriptEl) {
            scriptEl.remove();
        }

        return () => {
            // Optional cleanup on unmount
            const oldScript = document.getElementById(SCRIPT_ID);
            if (oldScript) oldScript.remove();
        };
    }, [fullTitle, description, ogImage, currentUrl, type, robots, schema]);

    return null;
}
