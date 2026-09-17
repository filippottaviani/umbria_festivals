import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.SITE_URL || 'https://sagraumbra.it';
const API_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1/festivals';
const OUTPUT_FILE = path.join(__dirname, '../public/sitemap.xml');

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

async function generateSitemap() {
    console.log('Inizio generazione sitemap.xml...');
    const today = new Date().toISOString().split('T')[0];

    const staticRoutes = [
        { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'daily', img: `${BASE_URL}/icon.svg`, title: 'Sagra Umbra — Sagre, Feste e Tradizioni nei Borghi' },
        { loc: `${BASE_URL}/mappa`, priority: '0.9', changefreq: 'weekly' },
        { loc: `${BASE_URL}/calendario`, priority: '0.9', changefreq: 'weekly' },
        { loc: `${BASE_URL}/segnala-sagra`, priority: '0.7', changefreq: 'monthly' },
    ];

    let festivalRoutes = [];

    try {
        console.log(`Recupero sagre dall'endpoint: ${API_URL}`);
        const res = await fetch(API_URL);
        if (res.ok) {
            const festivals = await res.json();
            console.log(`Trovate ${festivals.length} sagre.`);
            festivalRoutes = festivals.map(f => {
                let imgLoc = null;
                if (f.image_url) {
                    imgLoc = f.image_url.startsWith('http') ? f.image_url : `${BASE_URL}${f.image_url}`;
                }
                const lastmod = f.start_date ? f.start_date.split('T')[0] : today;
                return {
                    loc: `${BASE_URL}/festival/${f.id}`,
                    lastmod,
                    priority: '0.8',
                    changefreq: 'weekly',
                    img: imgLoc,
                    title: `${f.name} - ${f.city} (${f.province})`
                };
            });
        } else {
            console.warn(`Risposta API non valida (${res.status}), sitemap generata solo con rotte statiche.`);
        }
    } catch (err) {
        console.warn(`Impossibile contattare l'API (${err.message}), sitemap generata solo con rotte statiche.`);
    }

    const allRoutes = [...staticRoutes, ...festivalRoutes];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    for (const route of allRoutes) {
        xml += `  <url>\n`;
        xml += `    <loc>${escapeXml(route.loc)}</loc>\n`;
        xml += `    <lastmod>${route.lastmod || today}</lastmod>\n`;
        xml += `    <changefreq>${route.changefreq || 'weekly'}</changefreq>\n`;
        xml += `    <priority>${route.priority || '0.5'}</priority>\n`;
        if (route.img) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(route.img)}</image:loc>\n`;
            if (route.title) {
                xml += `      <image:title>${escapeXml(route.title)}</image:title>\n`;
            }
            xml += `    </image:image>\n`;
        }
        xml += `  </url>\n`;
    }

    xml += `</urlset>\n`;

    fs.writeFileSync(OUTPUT_FILE, xml, 'utf-8');
    console.log(`✅ Sitemap generata con successo in ${OUTPUT_FILE} (${allRoutes.length} URLs).`);
}

generateSitemap();
