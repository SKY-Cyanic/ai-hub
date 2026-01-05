
import React, { useState, useEffect } from 'react';
import { Link2, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface OGData {
    title?: string;
    description?: string;
    image?: string;
    url: string;
}

interface LinkPreviewCardProps {
    url: string;
}

const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ url }) => {
    const [ogData, setOgData] = useState<OGData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchOG = async () => {
            setLoading(true);
            setError(false);
            try {
                // Using a CORS proxy for client-side OG fetching
                // In production, use your own backend API
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
                const res = await fetch(proxyUrl);
                const data = await res.json();
                const html = data.contents;

                // Parse OG tags from HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
                    || doc.querySelector('title')?.textContent || url;
                const description = doc.querySelector('meta[property="og:description"]')?.getAttribute('content')
                    || doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
                const image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

                setOgData({ title, description, image, url });
            } catch (e) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (url) fetchOG();
    }, [url]);

    if (loading) {
        return (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 animate-pulse flex gap-3 my-2">
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
            </div>
        );
    }

    if (error || !ogData) {
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 my-2 text-sm">
                <Link2 size={14} /> {url}
            </a>
        );
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow my-3 group"
        >
            <div className="flex">
                {ogData.image && (
                    <div className="w-28 h-24 flex-shrink-0 bg-gray-100 dark:bg-gray-900 overflow-hidden">
                        <img src={ogData.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                )}
                <div className="flex-1 p-3 min-w-0">
                    <h4 className="font-bold text-sm text-gray-800 dark:text-white truncate group-hover:text-indigo-600">{ogData.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{ogData.description}</p>
                    <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1 truncate">
                        <ExternalLink size={10} /> {new URL(url).hostname}
                    </p>
                </div>
            </div>
        </a>
    );
};

export default LinkPreviewCard;
