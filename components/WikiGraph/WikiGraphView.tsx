// @ts-nocheck
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Search, ZoomIn, ZoomOut, Maximize, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GraphSidebar from './GraphSidebar';
import { CONFIG, COLORS } from './parameters';
import { SidebarData, TabType } from './types';

interface WikiGraphProps {
    initialSlug?: string;
    onNodeSelect?: (slug: string) => void;
    mini?: boolean;
}

const WikiGraphView: React.FC<WikiGraphProps> = ({ initialSlug, onNodeSelect, mini = false }) => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const networkRef = useRef<any>(null); // vis.Network instance
    const nodesRef = useRef<any>(null); // vis.DataSet
    const edgesRef = useRef<any>(null); // vis.DataSet
    const [visLoaded, setVisLoaded] = useState(false);

    // UI State
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('info');
    const [sidebarData, setSidebarData] = useState<SidebarData | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [status, setStatus] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [stats, setStats] = useState({ nodes: 0, edges: 0 });
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // --- Init & Effects ---

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);

        // Load Vis.js from CDN to avoid bundler issues
        if ((window as any).vis) {
            setVisLoaded(true);
        } else {
            const script = document.createElement('script');
            script.src = "https://unpkg.com/vis-network/standalone/umd/vis-network.min.js";
            script.async = true;
            script.onload = () => setVisLoaded(true);
            script.onerror = () => setStatus("그래프 라이브러리 로드 실패");
            document.body.appendChild(script);
        }

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const initNetwork = useCallback(() => {
        if (!containerRef.current || !visLoaded) return;
        const vis = (window as any).vis;
        if (!vis) return;

        // Init DataSets
        const nodes = new vis.DataSet([]);
        const edges = new vis.DataSet([]);
        nodesRef.current = nodes;
        edgesRef.current = edges;

        const data = { nodes, edges };
        const options = {
            nodes: {
                shape: 'dot',
                size: 20,
                font: { size: 14, color: COLORS.font.color, face: 'sans-serif', strokeWidth: 4, strokeColor: '#0f172a' },
                borderWidth: 2,
                color: { background: COLORS.node.bg, border: COLORS.node.border, highlight: { background: COLORS.node.highlight, border: '#f59e0b' } },
                shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 10 },
            },
            edges: {
                width: 1,
                color: { color: COLORS.edge.color, highlight: COLORS.edge.highlight, opacity: 1.0 },
                smooth: { type: 'continuous' }
            },
            physics: {
                forceAtlas2Based: {
                    gravitationalConstant: -100,
                    centralGravity: 0.005,
                    springLength: CONFIG.springLength,
                    springConstant: 0.09,
                    damping: 0.9
                },
                solver: 'forceAtlas2Based',
                stabilization: { iterations: 150 }
            },
            interaction: { hover: true, tooltipDelay: 200, zoomView: true, hideEdgesOnDrag: true }
        };

        const network = new vis.Network(containerRef.current, data, options);
        networkRef.current = network;

        // --- Events ---
        network.on("click", (params: any) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                handleSelectNode(nodeId);
            } else {
                if (!isMobile) setSidebarOpen(false);
            }
        });

        network.on("doubleClick", (params: any) => {
            if (params.nodes.length > 0) {
                expandNode(params.nodes[0]);
            }
        });

        const interval = setInterval(() => {
            if (nodesRef.current && edgesRef.current) {
                setStats({
                    nodes: nodesRef.current.length,
                    edges: edgesRef.current.length
                });
            }
        }, 1000);

        return () => clearInterval(interval);

    }, [visLoaded, isMobile]); // Re-init when loaded

    useEffect(() => {
        if (visLoaded) {
            initNetwork();

            if (initialSlug) {
                // Wait a bit for network to settle
                setTimeout(() => {
                    expandNode(initialSlug);
                    handleSelectNode(initialSlug);
                }, 100);
            } else {
                expandNode('인공지능');
            }
        }

        return () => {
            // Cleanup if needed, but destroying networkRef is handled in initNetwork or let garbage collected
            if (networkRef.current) {
                networkRef.current.destroy();
                networkRef.current = null;
            }
        };
    }, [visLoaded]);

    useEffect(() => {
        if (initialSlug && nodesRef.current && networkRef.current) {
            const existing = nodesRef.current.get(initialSlug);
            if (existing) {
                networkRef.current.focus(initialSlug, { animation: true, scale: 1.0 });
                handleSelectNode(initialSlug);
            } else {
                expandNode(initialSlug);
            }
        }
    }, [initialSlug]);

    // --- Graph Operations ---

    const handleSelectNode = async (title: string) => {
        setActiveTab('info');
        setSidebarOpen(true);
        if (onNodeSelect) onNodeSelect(title);

        setSidebarData(null);
        const params = new URLSearchParams({
            action: 'query', format: 'json',
            prop: 'extracts|pageimages|extlinks|categories',
            titles: title,
            exintro: 'false', explaintext: 'true',
            pithumbsize: '600', ellimit: '20', cllimit: '10', origin: '*'
        });

        try {
            const res = await fetch(`${CONFIG.endpoints[CONFIG.lang]}?${params.toString()}`);
            const data = await res.json();
            const pages = data.query.pages;
            const pid = Object.keys(pages)[0];
            if (pid !== "-1") {
                const page = pages[pid];
                const inLinks = edgesRef.current?.get({ filter: (e: any) => e.to === title }).length || 0;
                setSidebarData({
                    title: page.title,
                    extract: page.extract,
                    thumbnail: page.thumbnail,
                    citationCount: inLinks,
                    categories: page.categories,
                    extlinks: page.extlinks
                });
            }
        } catch (e) {
            console.error(e);
        }
    };

    const expandNode = async (title: string) => {
        if (!nodesRef.current || !edgesRef.current) return;

        setStatus(`"${title}" 탐색 중...`);
        setIsLoading(true);

        if (!nodesRef.current.get(title)) {
            nodesRef.current.add({ id: title, label: title, value: 20, group: 'New' });
        }

        const params = new URLSearchParams({
            action: 'query', format: 'json', prop: 'links', titles: title,
            pllimit: 'max', plnamespace: '0', origin: '*'
        });

        try {
            const res = await fetch(`${CONFIG.endpoints[CONFIG.lang]}?${params.toString()}`);
            const data = await res.json();
            const pages = data.query.pages;
            const pid = Object.keys(pages)[0];
            const links = (pid !== "-1" && pages[pid].links) ? pages[pid].links.map((l: any) => l.title) : [];

            if (links.length) {
                const subset = links.sort(() => 0.5 - Math.random()).slice(0, CONFIG.maxLinks);
                const newNodes: any[] = [];
                const newEdges: any[] = [];

                subset.forEach((link: string) => {
                    const existingNode = nodesRef.current!.get(link);
                    if (!existingNode && !newNodes.find(n => n.id === link)) {
                        newNodes.push({ id: link, label: link, value: 1 });
                    }
                    const existingEdges = edgesRef.current!.get({
                        filter: (e: any) => (e.from === title && e.to === link) || (e.from === link && e.to === title)
                    });

                    if (existingEdges.length === 0) {
                        newEdges.push({ from: title, to: link });
                    }
                });

                nodesRef.current.add(newNodes);
                edgesRef.current.add(newEdges);
                updateNodeSizes();
            } else {
                setStatus("연결된 문서가 없습니다.");
            }
        } catch (e) {
            console.error('API Error', e);
            setStatus("데이터 로드 실패");
        } finally {
            setIsLoading(false);
            setStatus('');
        }
    };

    const updateNodeSizes = () => {
        if (!nodesRef.current || !networkRef.current || !edgesRef.current) return;
        const updates: any[] = [];
        nodesRef.current.forEach((node: any) => {
            const outConnections = networkRef.current!.getConnectedNodes(node.id) as string[];
            const inLinks = edgesRef.current!.get({ filter: (e: any) => e.to === node.id }).length;
            const totalCount = outConnections.length;

            let style = COLORS.node.levels[0];
            for (let i = COLORS.node.levels.length - 1; i >= 0; i--) {
                if (totalCount >= COLORS.node.levels[i].min) {
                    style = COLORS.node.levels[i];
                    break;
                }
            }

            updates.push({
                id: node.id,
                value: Math.max(inLinks * 5, 10),
                color: { background: style.bg, border: style.border },
                font: { size: Math.max(14, inLinks * 2) }
            });
        });
        nodesRef.current.update(updates);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            expandNode(searchQuery.trim());
            handleSelectNode(searchQuery.trim());
        }
    };

    return (
        <div
            className={`relative w-full bg-slate-900 overflow-hidden rounded-2xl shadow-2xl border border-slate-700 group flex flex-col md:flex-row ${mini ? '' : 'h-full'}`}
            style={{ height: mini ? (isMobile ? '300px' : '100%') : '100%' }}
        >

            {/* Main Graph Area */}
            <div className="flex-1 relative h-full">
                <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing bg-[#0b1220]" style={{ height: '100%' }} />

                {/* HUD: Stats */}
                <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-2">
                    <div className="bg-slate-800/80 backdrop-blur-md p-3 rounded-xl border border-slate-700 pointer-events-auto flex gap-4 text-xs text-slate-300 shadow-lg">
                        <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-bold">Nodes</span>
                            <span className="text-blue-400 font-bold text-lg">{stats.nodes}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-bold">Edges</span>
                            <span className="text-green-400 font-bold text-lg">{stats.edges}</span>
                        </div>
                    </div>
                </div>

                {/* Status Indicator */}
                {isLoading && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600/90 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse flex items-center gap-2 z-10">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {status || '처 리 중...'}
                    </div>
                )}

                {/* Search Bar */}
                <div className="absolute bottom-6 left-6 right-6 md:left-20 md:right-auto md:w-96 pointer-events-none flex justify-center md:justify-start z-20">
                    <form onSubmit={handleSearch} className="pointer-events-auto w-full relative bg-slate-800/90 backdrop-blur-md p-1 rounded-full border border-slate-600 shadow-2xl flex items-center transition-transform focus-within:scale-105">
                        <Search className="ml-4 text-slate-400" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isMobile ? "탐험..." : "지식 탐험 시작 (키워드 입력)"}
                            className="bg-transparent border-none outline-none text-white px-4 py-3 flex-1 placeholder-slate-500 min-w-0"
                        />
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 md:px-6 py-2 font-bold transition-colors whitespace-nowrap">
                            Go
                        </button>
                    </form>
                </div>

                {/* Toggle Sidebar Button */}
                {!sidebarOpen && (
                    <div className="absolute top-4 right-4 pointer-events-auto">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-lg border border-slate-700 transition"
                        >
                            <Menu size={24} />
                        </button>
                    </div>
                )}

                {/* Zoom Controls */}
                <div className="absolute bottom-24 right-4 flex flex-col gap-2 pointer-events-auto z-10">
                    <button onClick={() => networkRef.current?.moveTo({ scale: 1.2 })} className="p-2 bg-slate-800/80 text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-700 transition">
                        <ZoomIn size={20} />
                    </button>
                    <button onClick={() => networkRef.current?.moveTo({ scale: 0.8 })} className="p-2 bg-slate-800/80 text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-700 transition">
                        <ZoomOut size={20} />
                    </button>
                    <button onClick={() => networkRef.current?.fit()} className="p-2 bg-slate-800/80 text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-700 transition">
                        <Maximize size={20} />
                    </button>
                </div>
            </div>

            {/* Sidebar */}
            <GraphSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                data={sidebarData}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onSearch={(q) => {
                    setSearchQuery(q);
                    expandNode(q);
                    handleSelectNode(q);
                    if (isMobile) setSidebarOpen(false);
                }}
                isMobile={isMobile}
            />
        </div>
    );
};

export default WikiGraphView;
