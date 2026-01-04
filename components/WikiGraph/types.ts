export type WikiNetwork = any; // vis.Network
export type WikiDataSet = any; // vis.DataSet

export interface WikiNode {
    id: string;
    label: string;
    value: number;
    group?: string;
    physics?: boolean;
    title?: string;
    color?: any;
    x?: number;
    y?: number;
}

export interface WikiEdge {
    from: string;
    to: string;
}

export interface SidebarData {
    title: string;
    extract?: string;
    thumbnail?: { source: string };
    citationCount?: number;
    extlinks?: any[];
    categories?: any[];
}

export type TabType = 'info' | 'ai' | 'notes' | 'media' | 'cluster';
