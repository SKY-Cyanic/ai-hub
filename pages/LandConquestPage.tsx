// LandConquestPage.tsx
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { Land } from '../types';

// ==================== Constants ====================
const HEX_SIZE = 24;
const HEX_HEIGHT = HEX_SIZE * 2;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const WORLD_SIZE = 100; // 100x100 hex world (wraps around)

// Biome configuration - NO EMOJIS, pure design
const BIOMES = {
    void: { name: 'Void', base: '#0a0a0f', accent: '#1a1a2e', pattern: 'none' },
    plains: { name: 'Grasslands', base: '#1a3d2e', accent: '#2d5a45', pattern: 'dots' },
    forest: { name: 'Dense Forest', base: '#0f2918', accent: '#1a4028', pattern: 'lines' },
    mountain: { name: 'Highlands', base: '#2a2a3a', accent: '#3d3d52', pattern: 'cross' },
    desert: { name: 'Arid Wastes', base: '#3d3020', accent: '#5a4830', pattern: 'dots' },
    tundra: { name: 'Frozen Tundra', base: '#2a3540', accent: '#3d4d5a', pattern: 'none' },
    volcanic: { name: 'Volcanic Zone', base: '#2d1a1a', accent: '#4a2828', pattern: 'lines' },
    crystal: { name: 'Crystal Fields', base: '#1a1a3d', accent: '#2d2d5a', pattern: 'cross' },
    ocean: { name: 'Deep Ocean', base: '#0a1a2d', accent: '#152840', pattern: 'waves' },
} as const;

type BiomeType = keyof typeof BIOMES;

interface HexCell {
    q: number;
    r: number;
    biome: BiomeType;
    elevation: number;
    moisture: number;
}

// ==================== Noise Generation ====================
class SimplexNoise {
    private perm: number[] = [];

    constructor(seed: number = 42) {
        const p = [];
        for (let i = 0; i < 256; i++) p[i] = i;

        let n: number, q: number;
        for (let i = 255; i > 0; i--) {
            n = Math.floor((seed = (seed * 16807) % 2147483647) / 2147483647 * (i + 1));
            q = p[i];
            p[i] = p[n];
            p[n] = q;
        }

        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
        }
    }

    noise2D(x: number, y: number): number {
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const G2 = (3 - Math.sqrt(3)) / 6;

        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        const t = (i + j) * G2;

        const X0 = i - t;
        const Y0 = j - t;
        const x0 = x - X0;
        const y0 = y - Y0;

        const i1 = x0 > y0 ? 1 : 0;
        const j1 = x0 > y0 ? 0 : 1;

        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;

        const ii = i & 255;
        const jj = j & 255;

        const grad = (hash: number, x: number, y: number) => {
            const h = hash & 7;
            const u = h < 4 ? x : y;
            const v = h < 4 ? y : x;
            return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
        };

        let n0 = 0, n1 = 0, n2 = 0;

        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            t0 *= t0;
            n0 = t0 * t0 * grad(this.perm[ii + this.perm[jj]], x0, y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            t1 *= t1;
            n1 = t1 * t1 * grad(this.perm[ii + i1 + this.perm[jj + j1]], x1, y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            t2 *= t2;
            n2 = t2 * t2 * grad(this.perm[ii + 1 + this.perm[jj + 1]], x2, y2);
        }

        return 70 * (n0 + n1 + n2);
    }

    fractal(x: number, y: number, octaves: number = 4): number {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += this.noise2D(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }

        return value / maxValue;
    }
}

// ==================== Utility Functions ====================
const wrapCoord = (value: number, max: number): number => {
    return ((value % max) + max) % max;
};

const axialToPixel = (q: number, r: number): { x: number; y: number } => ({
    x: HEX_SIZE * Math.sqrt(3) * (q + r / 2),
    y: HEX_SIZE * 1.5 * r
});

const pixelToAxial = (x: number, y: number): { q: number; r: number } => {
    const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / HEX_SIZE;
    const r = (2 / 3 * y) / HEX_SIZE;
    return { q: Math.round(q), r: Math.round(r) };
};

const getHexCorners = (cx: number, cy: number, size: number): [number, number][] => {
    const corners: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        corners.push([
            cx + size * Math.cos(angle),
            cy + size * Math.sin(angle)
        ]);
    }
    return corners;
};

const getBiome = (elevation: number, moisture: number): BiomeType => {
    if (elevation < -0.3) return 'ocean';
    if (elevation < -0.1) return moisture > 0.3 ? 'plains' : 'desert';
    if (elevation < 0.2) return moisture > 0.5 ? 'forest' : moisture > 0.2 ? 'plains' : 'desert';
    if (elevation < 0.5) return moisture > 0.4 ? 'forest' : 'mountain';
    if (elevation < 0.7) return moisture < 0 ? 'volcanic' : 'tundra';
    return moisture > 0.3 ? 'crystal' : 'tundra';
};

// ==================== Sub Components ====================

// Premium Minimap
const Minimap: React.FC<{
    cells: Map<string, HexCell>;
    lands: Record<string, Land>;
    camera: { x: number; y: number; scale: number };
    canvasSize: { width: number; height: number };
    userId?: string;
    onNavigate: (q: number, r: number) => void;
}> = ({ cells, lands, camera, canvasSize, userId, onNavigate }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const size = 180;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Background
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, size, size);

        // Border glow
        const borderGrad = ctx.createLinearGradient(0, 0, size, size);
        borderGrad.addColorStop(0, '#6366f1');
        borderGrad.addColorStop(1, '#ec4899');
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

        const scale = size / (WORLD_SIZE * 2);
        const offsetX = size / 2;
        const offsetY = size / 2;

        // Draw cells
        cells.forEach((cell, key) => {
            const { x, y } = axialToPixel(cell.q, cell.r);
            const mx = x * scale * 0.08 + offsetX;
            const my = y * scale * 0.08 + offsetY;

            if (mx < 0 || mx > size || my < 0 || my > size) return;

            const landKey = `${cell.q}_${cell.r}`;
            const land = lands[landKey];

            if (land) {
                ctx.fillStyle = land.owner_id === userId ? '#ec4899' : '#6366f1';
            } else {
                ctx.fillStyle = BIOMES[cell.biome].accent + '60';
            }

            ctx.beginPath();
            ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Viewport indicator
        const viewWidth = (canvasSize.width / camera.scale) * scale * 0.04;
        const viewHeight = (canvasSize.height / camera.scale) * scale * 0.04;
        const viewX = (-camera.x / camera.scale) * scale * 0.04 + offsetX - viewWidth / 2;
        const viewY = (-camera.y / camera.scale) * scale * 0.04 + offsetY - viewHeight / 2;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(viewX, viewY, viewWidth, viewHeight);
        ctx.setLineDash([]);

    }, [cells, lands, camera, canvasSize, userId]);

    return (
        <div className="absolute top-4 right-4 z-30">
            <div className="relative group">
                {/* Outer glow */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-lg blur opacity-30 group-hover:opacity-50 transition-opacity" />

                <div className="relative bg-gray-950 rounded-lg p-1 border border-gray-800">
                    <div className="text-[10px] text-gray-500 text-center mb-1 font-mono tracking-widest">
                        WORLD MAP
                    </div>
                    <canvas
                        ref={canvasRef}
                        width={size}
                        height={size}
                        className="rounded cursor-crosshair"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left - size / 2;
                            const y = e.clientY - rect.top - size / 2;
                            const worldX = x / (size / (WORLD_SIZE * 2)) / 0.08;
                            const worldY = y / (size / (WORLD_SIZE * 2)) / 0.08;
                            const { q, r } = pixelToAxial(worldX, worldY);
                            onNavigate(q, r);
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

// Stats Dashboard
const StatsDashboard: React.FC<{
    lands: Record<string, Land>;
    userId?: string;
    userBalance: number;
}> = ({ lands, userId, userBalance }) => {
    const stats = useMemo(() => {
        const owned = Object.values(lands).filter(l => l.owner_id === userId);
        const totalValue = owned.reduce((sum, l) => sum + (l.price || 100), 0);
        const expiringSoon = owned.filter(l => {
            const daysLeft = (new Date(l.tax_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            return daysLeft < 2 && daysLeft > 0;
        }).length;
        const expired = owned.filter(l => new Date(l.tax_due_date).getTime() < Date.now()).length;

        return { owned: owned.length, totalValue, expiringSoon, expired };
    }, [lands, userId]);

    return (
        <div className="absolute top-4 left-4 z-30 w-64">
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity" />

                <div className="relative bg-gray-950/95 backdrop-blur-xl rounded-2xl border border-gray-800/50 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-800/50 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs font-mono text-gray-400 tracking-wider">TERRITORY STATUS</span>
                            </div>
                        </div>
                    </div>

                    {/* Balance */}
                    <div className="px-4 py-3 border-b border-gray-800/30">
                        <div className="text-[10px] text-gray-500 font-mono mb-1">AVAILABLE CREDITS</div>
                        <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                            {userBalance.toLocaleString()} <span className="text-sm">CR</span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-px bg-gray-800/30">
                        <div className="bg-gray-950 p-3 text-center">
                            <div className="text-xl font-black text-pink-400">{stats.owned}</div>
                            <div className="text-[10px] text-gray-500 font-mono">OWNED</div>
                        </div>
                        <div className="bg-gray-950 p-3 text-center">
                            <div className="text-xl font-black text-indigo-400">{stats.totalValue}</div>
                            <div className="text-[10px] text-gray-500 font-mono">VALUE</div>
                        </div>
                        <div className="bg-gray-950 p-3 text-center">
                            <div className={`text-xl font-black ${stats.expiringSoon > 0 ? 'text-amber-400' : 'text-gray-600'}`}>
                                {stats.expiringSoon}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono">EXPIRING</div>
                        </div>
                        <div className="bg-gray-950 p-3 text-center">
                            <div className={`text-xl font-black ${stats.expired > 0 ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
                                {stats.expired}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono">EXPIRED</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Cell Detail Panel
const CellDetailPanel: React.FC<{
    cell: HexCell;
    land?: Land;
    userId?: string;
    onClose: () => void;
    onPurchase: () => void;
    onPayTax: () => void;
    onEdit: () => void;
}> = ({ cell, land, userId, onClose, onPurchase, onPayTax, onEdit }) => {
    const biome = BIOMES[cell.biome];
    const isOwner = land?.owner_id === userId;
    const isExpired = land && new Date(land.tax_due_date).getTime() < Date.now();
    const canClaim = !land || isExpired;
    const isOcean = cell.biome === 'ocean';

    const daysUntilExpiry = land ? Math.ceil((new Date(land.tax_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

    return (
        <div className="fixed bottom-6 right-6 z-40 w-80">
            <div className="relative group">
                {/* Animated border */}
                <div
                    className="absolute -inset-0.5 rounded-2xl blur-sm opacity-50 animate-pulse"
                    style={{ background: `linear-gradient(135deg, ${biome.accent}, ${biome.base})` }}
                />

                <div className="relative bg-gray-950/98 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden">
                    {/* Header */}
                    <div
                        className="px-5 py-4 relative overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${biome.base}90, ${biome.accent}60)` }}
                    >
                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute inset-0" style={{
                                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                                backgroundSize: '20px 20px',
                            }} />
                        </div>

                        <div className="relative flex justify-between items-start">
                            <div>
                                <div className="text-[10px] font-mono text-gray-400 mb-1 tracking-widest">
                                    SECTOR {cell.q.toString().padStart(3, '0')}.{cell.r.toString().padStart(3, '0')}
                                </div>
                                <h3 className="text-lg font-black text-white">{biome.name}</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg bg-black/30 hover:bg-black/50 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Status badge */}
                        {land && (
                            <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${isOwner ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' :
                                    isExpired ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                        'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isOwner ? 'bg-pink-400' : isExpired ? 'bg-red-400 animate-pulse' : 'bg-indigo-400'
                                    }`} />
                                {isOwner ? 'YOUR TERRITORY' : isExpired ? 'EXPIRED CLAIM' : 'OCCUPIED'}
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                        {/* Terrain Info */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-800/50">
                                <div className="text-[10px] text-gray-500 font-mono mb-1">ELEVATION</div>
                                <div className="text-lg font-bold text-white">
                                    {(cell.elevation * 1000).toFixed(0)}m
                                </div>
                            </div>
                            <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-800/50">
                                <div className="text-[10px] text-gray-500 font-mono mb-1">MOISTURE</div>
                                <div className="text-lg font-bold text-white">
                                    {((cell.moisture + 1) * 50).toFixed(0)}%
                                </div>
                            </div>
                        </div>

                        {land ? (
                            <>
                                {/* Land Info */}
                                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/50 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500 font-mono">OWNER</span>
                                        <span className="text-sm text-white font-mono">
                                            {land.owner_id.slice(0, 8)}...
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500 font-mono">VALUE</span>
                                        <span className="text-sm font-bold text-yellow-400">
                                            {land.price} CR
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500 font-mono">TAX STATUS</span>
                                        <span className={`text-sm font-bold ${isExpired ? 'text-red-400' :
                                                daysUntilExpiry < 3 ? 'text-amber-400' :
                                                    'text-green-400'
                                            }`}>
                                            {isExpired ? 'EXPIRED' : `${daysUntilExpiry}D LEFT`}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                {isOwner ? (
                                    <div className="space-y-2">
                                        <button
                                            onClick={onPayTax}
                                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            PAY TAX · 20 CR
                                        </button>
                                        <button
                                            onClick={onEdit}
                                            className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            MANAGE CONTENT
                                        </button>
                                    </div>
                                ) : isExpired ? (
                                    <button
                                        onClick={onPurchase}
                                        className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl font-black text-white transition-all animate-pulse"
                                    >
                                        CLAIM EXPIRED TERRITORY · 100 CR
                                    </button>
                                ) : (
                                    <div className="py-3 bg-gray-800/50 rounded-xl text-center text-sm text-gray-500 border border-gray-700/50">
                                        Territory is currently owned
                                    </div>
                                )}

                                {/* Link */}
                                {land.link_url && (
                                    <a
                                        href={land.link_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        Visit linked content →
                                    </a>
                                )}
                            </>
                        ) : (
                            <>
                                {isOcean ? (
                                    <div className="py-6 text-center">
                                        <div className="text-4xl mb-3 opacity-50">〰️</div>
                                        <div className="text-gray-400 text-sm">
                                            Ocean territories cannot be claimed
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/50">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs text-gray-500 font-mono">CLAIM COST</span>
                                                <span className="text-xl font-black text-yellow-400">100 CR</span>
                                            </div>
                                            <div className="text-[10px] text-gray-500 leading-relaxed">
                                                Claiming grants full ownership rights including content placement and advertising space.
                                            </div>
                                        </div>

                                        <button
                                            onClick={onPurchase}
                                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-black text-white transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02]"
                                        >
                                            CLAIM TERRITORY
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Content Editor Modal
const ContentEditorModal: React.FC<{
    land: Land;
    onClose: () => void;
    onSave: (imageUrl: string, linkUrl: string) => Promise<void>;
}> = ({ land, onClose, onSave }) => {
    const [imageUrl, setImageUrl] = useState(land.image_url || '');
    const [linkUrl, setLinkUrl] = useState(land.link_url || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(imageUrl, linkUrl);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-3xl blur opacity-30" />

                <div className="relative bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-pink-900/20 to-purple-900/20">
                        <div>
                            <div className="text-[10px] font-mono text-gray-500 mb-1">CONTENT MANAGER</div>
                            <h3 className="text-lg font-bold text-white">Territory Settings</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Form */}
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="text-xs font-mono text-gray-400 mb-2 block">IMAGE URL</label>
                            <input
                                type="url"
                                value={imageUrl}
                                onChange={e => setImageUrl(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all"
                                placeholder="https://example.com/image.png"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-mono text-gray-400 mb-2 block">LINK URL</label>
                            <input
                                type="url"
                                value={linkUrl}
                                onChange={e => setLinkUrl(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all"
                                placeholder="https://yourwebsite.com"
                            />
                        </div>

                        {/* Preview */}
                        {imageUrl && (
                            <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                                <div className="text-[10px] font-mono text-gray-500 mb-2">PREVIEW</div>
                                <img
                                    src={imageUrl}
                                    alt="Preview"
                                    className="w-full h-32 object-cover rounded-lg bg-gray-800"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚠️</text></svg>';
                                    }}
                                />
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-gray-300 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-xl font-bold text-white transition-all disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Zoom Controls
const ZoomControls: React.FC<{
    scale: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
}> = ({ scale, onZoomIn, onZoomOut, onReset }) => (
    <div className="absolute bottom-6 right-[340px] z-30 flex items-center gap-2">
        <div className="flex bg-gray-950/95 backdrop-blur-xl rounded-full border border-gray-800 overflow-hidden shadow-xl">
            <button
                onClick={onZoomOut}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
            </button>
            <div className="w-16 h-10 flex items-center justify-center text-xs font-mono text-gray-400 border-x border-gray-800">
                {Math.round(scale * 100)}%
            </div>
            <button
                onClick={onZoomIn}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
        <button
            onClick={onReset}
            className="w-10 h-10 bg-gray-950/95 backdrop-blur-xl rounded-full border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all shadow-xl"
            title="Reset View"
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
        </button>
    </div>
);

// Coordinates Display
const CoordinatesDisplay: React.FC<{ q: number; r: number }> = ({ q, r }) => (
    <div className="absolute bottom-6 left-6 z-30">
        <div className="bg-gray-950/95 backdrop-blur-xl rounded-xl border border-gray-800 px-4 py-2 shadow-xl">
            <div className="text-[10px] font-mono text-gray-500 mb-0.5">COORDINATES</div>
            <div className="text-sm font-mono text-white">
                Q: {q.toString().padStart(4, ' ')} | R: {r.toString().padStart(4, ' ')}
            </div>
        </div>
    </div>
);

// ==================== Main Component ====================
const LandConquestPage: React.FC = () => {
    const { user } = useAuth();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // World state
    const [lands, setLands] = useState<Record<string, Land>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

    // Camera state
    const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [lastCamera, setLastCamera] = useState({ x: 0, y: 0 });

    // Selection state
    const [hoveredCell, setHoveredCell] = useState<HexCell | null>(null);
    const [selectedCell, setSelectedCell] = useState<HexCell | null>(null);
    const [showEditor, setShowEditor] = useState(false);

    // Noise generator
    const noise = useMemo(() => new SimplexNoise(42), []);

    // Generate cell data with wrapping
    const getCellAt = useCallback((q: number, r: number): HexCell => {
        // Wrap coordinates for infinite world
        const wq = wrapCoord(q, WORLD_SIZE);
        const wr = wrapCoord(r, WORLD_SIZE);

        const scale = 0.05;
        const elevation = noise.fractal(wq * scale, wr * scale, 4);
        const moisture = noise.fractal((wq + 1000) * scale, (wr + 1000) * scale, 3);
        const biome = getBiome(elevation, moisture);

        return { q, r, biome, elevation, moisture };
    }, [noise]);

    // Generate visible cells based on camera
    const visibleCells = useMemo(() => {
        const cells = new Map<string, HexCell>();

        if (!containerRef.current) return cells;

        const { width, height } = containerRef.current.getBoundingClientRect();
        const padding = 4;

        // Calculate visible range in hex coordinates
        const topLeft = pixelToAxial(
            (-camera.x - width / 2) / camera.scale - HEX_WIDTH * padding,
            (-camera.y - height / 2) / camera.scale - HEX_HEIGHT * padding
        );
        const bottomRight = pixelToAxial(
            (-camera.x + width / 2) / camera.scale + HEX_WIDTH * padding,
            (-camera.y + height / 2) / camera.scale + HEX_HEIGHT * padding
        );

        for (let r = topLeft.r - padding; r <= bottomRight.r + padding; r++) {
            for (let q = topLeft.q - padding; q <= bottomRight.q + padding; q++) {
                const cell = getCellAt(q, r);
                cells.set(`${q}_${r}`, cell);
            }
        }

        return cells;
    }, [camera, getCellAt]);

    // Load lands
    const loadLands = useCallback(async () => {
        setIsLoading(true);
        const allLands = await storage.getAllLands();
        const landMap: Record<string, Land> = {};
        allLands.forEach(l => landMap[l.id] = l);
        setLands(landMap);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadLands();
    }, [loadLands]);

    // Load images
    useEffect(() => {
        Object.values(lands).forEach(land => {
            if (land.image_url && !loadedImages[land.image_url]) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = land.image_url;
                img.onload = () => {
                    setLoadedImages(prev => ({ ...prev, [land.image_url!]: img }));
                };
            }
        });
    }, [lands, loadedImages]);

    // Drawing
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Background gradient
        const bgGrad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height)
        );
        bgGrad.addColorStop(0, '#0f0f18');
        bgGrad.addColorStop(1, '#050508');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2 + camera.x, canvas.height / 2 + camera.y);
        ctx.scale(camera.scale, camera.scale);

        // Draw cells
        visibleCells.forEach((cell, key) => {
            const { x, y } = axialToPixel(cell.q, cell.r);
            const corners = getHexCorners(x, y, HEX_SIZE - 1);
            const biome = BIOMES[cell.biome];

            // Get land data with wrapping
            const wq = wrapCoord(cell.q, WORLD_SIZE);
            const wr = wrapCoord(cell.r, WORLD_SIZE);
            const landKey = `${wq}_${wr}`;
            const land = lands[landKey];

            // Determine fill color
            let fillColor = biome.base;
            let strokeColor = biome.accent;
            let isOwned = false;
            let isExpired = false;

            if (land) {
                isOwned = land.owner_id === user?.id;
                isExpired = new Date(land.tax_due_date).getTime() < Date.now();

                if (isOwned) {
                    fillColor = '#831843';
                    strokeColor = '#ec4899';
                } else if (isExpired) {
                    fillColor = '#7f1d1d';
                    strokeColor = '#ef4444';
                } else {
                    fillColor = '#312e81';
                    strokeColor = '#6366f1';
                }
            }

            // Draw hexagon
            ctx.beginPath();
            ctx.moveTo(corners[0][0], corners[0][1]);
            for (let i = 1; i < 6; i++) {
                ctx.lineTo(corners[i][0], corners[i][1]);
            }
            ctx.closePath();

            // Fill gradient
            const grad = ctx.createLinearGradient(x, y - HEX_SIZE, x, y + HEX_SIZE);
            grad.addColorStop(0, fillColor);
            grad.addColorStop(1, adjustBrightness(fillColor, -20));
            ctx.fillStyle = grad;
            ctx.fill();

            // Draw image if available
            if (land?.image_url && loadedImages[land.image_url]) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(corners[0][0], corners[0][1]);
                for (let i = 1; i < 6; i++) {
                    ctx.lineTo(corners[i][0], corners[i][1]);
                }
                ctx.closePath();
                ctx.clip();

                const img = loadedImages[land.image_url];
                const size = HEX_SIZE * 2;
                ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
                ctx.restore();
            }

            // Stroke
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Glow for owned cells
            if (isOwned) {
                ctx.shadowColor = '#ec4899';
                ctx.shadowBlur = 10;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        });

        // Draw hover highlight
        if (hoveredCell) {
            const { x, y } = axialToPixel(hoveredCell.q, hoveredCell.r);
            const corners = getHexCorners(x, y, HEX_SIZE + 1);

            ctx.beginPath();
            ctx.moveTo(corners[0][0], corners[0][1]);
            for (let i = 1; i < 6; i++) {
                ctx.lineTo(corners[i][0], corners[i][1]);
            }
            ctx.closePath();

            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#22d3ee';
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Draw selection highlight
        if (selectedCell) {
            const { x, y } = axialToPixel(selectedCell.q, selectedCell.r);
            const corners = getHexCorners(x, y, HEX_SIZE + 2);

            ctx.beginPath();
            ctx.moveTo(corners[0][0], corners[0][1]);
            for (let i = 1; i < 6; i++) {
                ctx.lineTo(corners[i][0], corners[i][1]);
            }
            ctx.closePath();

            ctx.strokeStyle = '#f472b6';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ec4899';
            ctx.shadowBlur = 20;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.restore();

    }, [visibleCells, camera, lands, loadedImages, hoveredCell, selectedCell, user]);

    // Event handlers
    const screenToWorld = useCallback((clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const sx = clientX - rect.left;
        const sy = clientY - rect.top;

        const wx = (sx - canvas.width / 2 - camera.x) / camera.scale;
        const wy = (sy - canvas.height / 2 - camera.y) / camera.scale;

        return pixelToAxial(wx, wy);
    }, [camera]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDragging) {
            setCamera(prev => ({
                ...prev,
                x: lastCamera.x + (e.clientX - dragStart.x),
                y: lastCamera.y + (e.clientY - dragStart.y)
            }));
            return;
        }

        const coord = screenToWorld(e.clientX, e.clientY);
        if (coord) {
            const cell = getCellAt(coord.q, coord.r);
            setHoveredCell(cell);
        }
    }, [isDragging, dragStart, lastCamera, screenToWorld, getCellAt]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setLastCamera({ x: camera.x, y: camera.y });
    }, [camera]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleClick = useCallback((e: React.MouseEvent) => {
        if (Math.abs(e.clientX - dragStart.x) > 5 || Math.abs(e.clientY - dragStart.y) > 5) return;

        const coord = screenToWorld(e.clientX, e.clientY);
        if (coord) {
            const cell = getCellAt(coord.q, coord.r);
            setSelectedCell(cell);
        }
    }, [screenToWorld, getCellAt, dragStart]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();

        const delta = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.min(Math.max(0.3, camera.scale * delta), 4);

        const coord = screenToWorld(e.clientX, e.clientY);
        if (!coord) return;

        const { x: wx, y: wy } = axialToPixel(coord.q, coord.r);
        const scaleRatio = newScale / camera.scale;

        setCamera(prev => ({
            x: prev.x - wx * (scaleRatio - 1) * prev.scale,
            y: prev.y - wy * (scaleRatio - 1) * prev.scale,
            scale: newScale
        }));
    }, [camera, screenToWorld]);

    // Actions
    const handlePurchase = async () => {
        if (!selectedCell || !user) return;
        if (selectedCell.biome === 'ocean') return;

        const wq = wrapCoord(selectedCell.q, WORLD_SIZE);
        const wr = wrapCoord(selectedCell.r, WORLD_SIZE);

        if (confirm(`Claim sector (${wq}, ${wr}) for 100 CR?`)) {
            const res = await storage.purchaseLand(user.id, wq, wr);
            alert(res.message);
            if (res.success) {
                loadLands();
                setSelectedCell(null);
            }
        }
    };

    const handlePayTax = async () => {
        if (!selectedCell || !user) return;

        const wq = wrapCoord(selectedCell.q, WORLD_SIZE);
        const wr = wrapCoord(selectedCell.r, WORLD_SIZE);
        const landKey = `${wq}_${wr}`;
        const land = lands[landKey];

        if (!land) return;

        if (confirm('Pay 20 CR tax to extend ownership by 7 days?')) {
            const res = await storage.payTax(user.id, land.id);
            alert(res.message);
            if (res.success) loadLands();
        }
    };

    const handleUpdateContent = async (imageUrl: string, linkUrl: string) => {
        if (!selectedCell || !user) return;

        const wq = wrapCoord(selectedCell.q, WORLD_SIZE);
        const wr = wrapCoord(selectedCell.r, WORLD_SIZE);
        const landKey = `${wq}_${wr}`;
        const land = lands[landKey];

        if (!land) return;

        const res = await storage.updateLand(user.id, land.id, { image_url: imageUrl, link_url: linkUrl });
        alert(res.message);
        if (res.success) {
            loadLands();
            setShowEditor(false);
        }
    };

    const handleNavigate = (q: number, r: number) => {
        const { x, y } = axialToPixel(q, r);
        setCamera(prev => ({
            ...prev,
            x: -x * prev.scale,
            y: -y * prev.scale
        }));
    };

    // Get land for selected cell
    const selectedLand = selectedCell ? lands[`${wrapCoord(selectedCell.q, WORLD_SIZE)}_${wrapCoord(selectedCell.r, WORLD_SIZE)}`] : undefined;

    return (
        <div className="relative w-full h-screen overflow-hidden bg-gray-950">
            {/* Canvas */}
            <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing">
                <canvas
                    ref={canvasRef}
                    onMouseMove={handleMouseMove}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onClick={handleClick}
                    onWheel={handleWheel}
                    className="w-full h-full"
                />
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="absolute inset-0 bg-gray-950 flex items-center justify-center z-50">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <div className="text-lg text-gray-400 font-mono">LOADING WORLD...</div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-gray-950 via-gray-950/80 to-transparent z-20 flex items-center justify-center pointer-events-none">
                <h1 className="text-2xl font-black tracking-tight">
                    <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-transparent bg-clip-text">
                        INFINITE TERRITORIES
                    </span>
                </h1>
            </div>

            {/* UI Panels */}
            <StatsDashboard
                lands={lands}
                userId={user?.id}
                userBalance={user?.points || 0}
            />

            <Minimap
                cells={visibleCells}
                lands={lands}
                camera={camera}
                canvasSize={{ width: containerRef.current?.clientWidth || 800, height: containerRef.current?.clientHeight || 600 }}
                userId={user?.id}
                onNavigate={handleNavigate}
            />

            <ZoomControls
                scale={camera.scale}
                onZoomIn={() => setCamera(c => ({ ...c, scale: Math.min(c.scale * 1.2, 4) }))}
                onZoomOut={() => setCamera(c => ({ ...c, scale: Math.max(c.scale / 1.2, 0.3) }))}
                onReset={() => setCamera({ x: 0, y: 0, scale: 1 })}
            />

            {hoveredCell && (
                <CoordinatesDisplay q={hoveredCell.q} r={hoveredCell.r} />
            )}

            {/* Detail Panel */}
            {selectedCell && (
                <CellDetailPanel
                    cell={selectedCell}
                    land={selectedLand}
                    userId={user?.id}
                    onClose={() => setSelectedCell(null)}
                    onPurchase={handlePurchase}
                    onPayTax={handlePayTax}
                    onEdit={() => setShowEditor(true)}
                />
            )}

            {/* Content Editor */}
            {showEditor && selectedLand && (
                <ContentEditorModal
                    land={selectedLand}
                    onClose={() => setShowEditor(false)}
                    onSave={handleUpdateContent}
                />
            )}
        </div>
    );
};

// Utility function
function adjustBrightness(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default LandConquestPage;