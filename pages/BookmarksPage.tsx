
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { Post } from '../types';
import { Link } from 'react-router-dom';
import { Bookmark, FolderPlus, Folder, Trash2, ChevronRight, Plus } from 'lucide-react';

interface ScrapFolder {
    id: string;
    name: string;
    post_ids: string[];
}

const BookmarksPage: React.FC = () => {
    const { user } = useAuth();
    const [folders, setFolders] = useState<ScrapFolder[]>([]);
    const [activeFolder, setActiveFolder] = useState<string | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [newFolderName, setNewFolderName] = useState('');

    useEffect(() => {
        if (user?.scrap_folders) {
            setFolders(user.scrap_folders);
        } else {
            // Default folder
            setFolders([{ id: 'default', name: '기본 폴더', post_ids: user?.scrapped_posts || [] }]);
        }
    }, [user]);

    useEffect(() => {
        if (!activeFolder) return;
        const folder = folders.find(f => f.id === activeFolder);
        if (!folder) return;

        storage.subscribePosts((allPosts) => {
            const filtered = allPosts.filter(p => folder.post_ids.includes(p.id));
            setPosts(filtered);
        });
    }, [activeFolder, folders]);

    const handleCreateFolder = () => {
        if (!newFolderName.trim()) return;
        const newFolder: ScrapFolder = {
            id: `folder-${Date.now()}`,
            name: newFolderName.trim(),
            post_ids: []
        };
        setFolders([...folders, newFolder]);
        setNewFolderName('');
        // Save to user profile (simplified, ideally via storage.updateUser)
    };

    if (!user) {
        return <div className="text-center py-20 text-gray-500">로그인이 필요합니다.</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-2xl p-6 shadow-lg">
                <h1 className="text-2xl font-black flex items-center gap-2"><Bookmark /> 북마크</h1>
                <p className="text-orange-100 text-sm mt-1">저장한 게시물을 폴더별로 관리하세요.</p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                {/* Sidebar: Folders */}
                <aside className="md:col-span-1 space-y-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm"><Folder size={16} /> 폴더</h3>
                        <div className="space-y-1">
                            {folders.map(folder => (
                                <button
                                    key={folder.id}
                                    onClick={() => setActiveFolder(folder.id)}
                                    className={`w-full text-left p-2 rounded-lg text-sm flex justify-between items-center transition-colors ${activeFolder === folder.id ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                                >
                                    <span>{folder.name}</span>
                                    <span className="text-xs text-gray-400">{folder.post_ids.length}</span>
                                </button>
                            ))}
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    placeholder="새 폴더"
                                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                />
                                <button
                                    onClick={handleCreateFolder}
                                    className="p-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main: Bookmarked Posts */}
                <main className="md:col-span-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                        {!activeFolder ? (
                            <div className="text-center py-10 text-gray-400">왼쪽에서 폴더를 선택하세요.</div>
                        ) : posts.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">이 폴더에 저장된 글이 없습니다.</div>
                        ) : (
                            <div className="space-y-2">
                                {posts.map(post => (
                                    <Link
                                        key={post.id}
                                        to={`/board/${post.board_id}/${post.id}`}
                                        className="block p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                                    >
                                        <p className="font-medium text-gray-800 dark:text-gray-200">{post.title}</p>
                                        <p className="text-xs text-gray-400 mt-1">{post.author.username} · {new Date(post.created_at).toLocaleDateString()}</p>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default BookmarksPage;
