// VibeCodePage.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getGroqClient, ChatMessage } from '../../services/groqClient';
import { UsageService, UsageInfo } from '../../services/usageService';
import { db } from '../../services/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-json';

// ==================== Types ====================
type Language = 'html' | 'css' | 'javascript' | 'typescript' | 'react' | 'python' | 'json';
type ViewMode = 'split' | 'code' | 'preview';
type Theme = 'dark' | 'light' | 'midnight' | 'forest';

interface ChatMsg {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    codeGenerated?: boolean;
}

type QualityLevel = 'draft' | 'standard' | 'premium' | 'masterpiece';

interface QualitySetting {
    id: QualityLevel;
    label: string;
    cost: number;
    tokens: number;
    temp: number;
    description: string;
    color: string;
}

const QUALITY_SETTINGS: QualitySetting[] = [
    { id: 'draft', label: 'Draft', cost: 20, tokens: 2000, temp: 0.5, description: 'Quick generation, basic logic', color: '#94a3b8' },
    { id: 'standard', label: 'Standard', cost: 50, tokens: 4000, temp: 0.3, description: 'Beautiful UI, stable code', color: '#6366f1' },
    { id: 'premium', label: 'Premium', cost: 100, tokens: 8000, temp: 0.2, description: 'Advanced animations, complex logic', color: '#a855f7' },
    { id: 'masterpiece', label: 'Masterpiece', cost: 200, tokens: 16000, temp: 0.1, description: 'Expert app structure, top quality', color: '#f59e0b' },
];

interface CodeVersion {
    id: string;
    code: string;
    language: Language;
    timestamp: Date;
    prompt?: string;
}

interface Template {
    id: string;
    name: string;
    description: string;
    language: Language;
    code: string;
    category: string;
    icon: React.ReactNode;
}

interface Project {
    id: string;
    title: string;
    code: string;
    language: Language;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== Constants ====================
const LANGUAGE_CONFIG: Record<Language, { label: string; ext: string; prism: string; color: string }> = {
    html: { label: 'HTML', ext: 'html', prism: 'markup', color: '#e34c26' },
    css: { label: 'CSS', ext: 'css', prism: 'css', color: '#264de4' },
    javascript: { label: 'JavaScript', ext: 'js', prism: 'javascript', color: '#f7df1e' },
    typescript: { label: 'TypeScript', ext: 'ts', prism: 'typescript', color: '#3178c6' },
    react: { label: 'React', ext: 'jsx', prism: 'jsx', color: '#61dafb' },
    python: { label: 'Python', ext: 'py', prism: 'python', color: '#3776ab' },
    json: { label: 'JSON', ext: 'json', prism: 'json', color: '#292929' },
};

const THEME_CONFIG: Record<Theme, { bg: string; editor: string; accent: string }> = {
    dark: { bg: '#0f0f14', editor: '#1a1a22', accent: '#6366f1' },
    light: { bg: '#f8fafc', editor: '#ffffff', accent: '#4f46e5' },
    midnight: { bg: '#0a0e1a', editor: '#0f1629', accent: '#8b5cf6' },
    forest: { bg: '#0a1210', editor: '#0f1a16', accent: '#10b981' },
};

const TEMPLATES: Template[] = [
    {
        id: 'landing',
        name: 'Landing Page',
        description: 'Modern landing page with hero section',
        language: 'html',
        category: 'Web',
        icon: <LayoutIcon />,
        code: `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui; background: linear-gradient(135deg, #667eea, #764ba2); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .hero { text-align: center; color: white; padding: 40px; }
    h1 { font-size: 3rem; margin-bottom: 1rem; }
    p { opacity: 0.8; margin-bottom: 2rem; }
    .btn { padding: 15px 40px; background: white; color: #667eea; border: none; border-radius: 30px; font-weight: bold; cursor: pointer; transition: transform 0.3s; }
    .btn:hover { transform: scale(1.05); }
  </style>
</head>
<body>
  <div class="hero">
    <h1>Welcome to the Future</h1>
    <p>Build amazing things with AI-powered tools</p>
    <button class="btn">Get Started</button>
  </div>
</body>
</html>`,
    },
    {
        id: 'counter',
        name: 'Counter App',
        description: 'Interactive counter with animations',
        language: 'html',
        category: 'Interactive',
        icon: <PlusCircleIcon />,
        code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui; background: #1a1a2e; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .counter { text-align: center; }
    .count { font-size: 6rem; font-weight: bold; color: white; margin: 20px 0; transition: transform 0.2s; }
    .buttons { display: flex; gap: 15px; }
    button { width: 60px; height: 60px; border: none; border-radius: 50%; font-size: 24px; cursor: pointer; transition: all 0.2s; }
    .dec { background: #ef4444; color: white; }
    .inc { background: #10b981; color: white; }
    button:hover { transform: scale(1.1); }
    button:active { transform: scale(0.95); }
  </style>
</head>
<body>
  <div class="counter">
    <div class="count" id="count">0</div>
    <div class="buttons">
      <button class="dec" onclick="update(-1)">−</button>
      <button class="inc" onclick="update(1)">+</button>
    </div>
  </div>
  <script>
    let count = 0;
    const el = document.getElementById('count');
    function update(n) {
      count += n;
      el.textContent = count;
      el.style.transform = 'scale(1.2)';
      setTimeout(() => el.style.transform = 'scale(1)', 150);
    }
  </script>
</body>
</html>`,
    },
    {
        id: 'todo',
        name: 'Todo List',
        description: 'Fully functional todo application',
        language: 'html',
        category: 'App',
        icon: <CheckSquareIcon />,
        code: `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui; background: linear-gradient(135deg, #1e3a5f, #0f172a); min-height: 100vh; padding: 40px; }
    .container { max-width: 500px; margin: 0 auto; }
    h1 { color: white; text-align: center; margin-bottom: 30px; }
    .input-group { display: flex; gap: 10px; margin-bottom: 20px; }
    input { flex: 1; padding: 15px 20px; border: none; border-radius: 12px; background: rgba(255,255,255,0.1); color: white; font-size: 16px; }
    input::placeholder { color: rgba(255,255,255,0.5); }
    button { padding: 15px 25px; background: #3b82f6; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: bold; }
    .todo-list { list-style: none; }
    .todo-item { background: rgba(255,255,255,0.1); padding: 15px 20px; border-radius: 12px; margin-bottom: 10px; display: flex; align-items: center; gap: 15px; color: white; animation: slideIn 0.3s; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .todo-item.done { opacity: 0.5; text-decoration: line-through; }
    .delete { margin-left: auto; background: none; color: #ef4444; padding: 5px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Todo List</h1>
    <div class="input-group">
      <input id="input" placeholder="Add a new task..." onkeypress="if(event.key==='Enter')addTodo()">
      <button onclick="addTodo()">Add</button>
    </div>
    <ul class="todo-list" id="list"></ul>
  </div>
  <script>
    function addTodo() {
      const input = document.getElementById('input');
      if (!input.value.trim()) return;
      const li = document.createElement('li');
      li.className = 'todo-item';
      li.innerHTML = \`<input type="checkbox" onchange="this.parentElement.classList.toggle('done')"><span>\${input.value}</span><button class="delete" onclick="this.parentElement.remove()">✕</button>\`;
      document.getElementById('list').appendChild(li);
      input.value = '';
    }
  </script>
</body>
</html>`,
    },
    {
        id: 'calculator',
        name: 'Calculator',
        description: 'Modern calculator with animations',
        language: 'html',
        category: 'App',
        icon: <CalculatorIcon />,
        code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui; background: #1a1a2e; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .calc { background: #16213e; padding: 20px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
    .display { background: #0f0f23; padding: 20px; border-radius: 12px; margin-bottom: 15px; text-align: right; }
    .display span { color: #666; font-size: 14px; display: block; }
    .display div { color: white; font-size: 36px; font-weight: bold; }
    .buttons { display: grid; grid-template-columns: repeat(4, 60px); gap: 10px; }
    button { width: 60px; height: 60px; border: none; border-radius: 12px; font-size: 20px; cursor: pointer; transition: all 0.2s; }
    .num { background: #1e3a5f; color: white; }
    .op { background: #3b82f6; color: white; }
    .eq { background: #10b981; color: white; grid-column: span 2; width: 130px; }
    .clear { background: #ef4444; color: white; }
    button:hover { transform: scale(1.05); filter: brightness(1.2); }
  </style>
</head>
<body>
  <div class="calc">
    <div class="display"><span id="prev"></span><div id="curr">0</div></div>
    <div class="buttons">
      <button class="clear" onclick="clear_()">C</button>
      <button class="op" onclick="op('/')">÷</button>
      <button class="op" onclick="op('*')">×</button>
      <button class="op" onclick="del()">⌫</button>
      <button class="num" onclick="num(7)">7</button>
      <button class="num" onclick="num(8)">8</button>
      <button class="num" onclick="num(9)">9</button>
      <button class="op" onclick="op('-')">−</button>
      <button class="num" onclick="num(4)">4</button>
      <button class="num" onclick="num(5)">5</button>
      <button class="num" onclick="num(6)">6</button>
      <button class="op" onclick="op('+')">+</button>
      <button class="num" onclick="num(1)">1</button>
      <button class="num" onclick="num(2)">2</button>
      <button class="num" onclick="num(3)">3</button>
      <button class="num" onclick="num(0)">0</button>
      <button class="eq" onclick="calc()">=</button>
    </div>
  </div>
  <script>
    let curr = '0', prev = '', oper = '';
    const update = () => { document.getElementById('curr').textContent = curr; document.getElementById('prev').textContent = prev + oper; };
    const num = n => { curr = curr === '0' ? String(n) : curr + n; update(); };
    const op = o => { prev = curr; oper = o; curr = '0'; update(); };
    const calc = () => { if (prev) { curr = String(eval(prev + oper + curr)); prev = ''; oper = ''; update(); } };
    const clear_ = () => { curr = '0'; prev = ''; oper = ''; update(); };
    const del = () => { curr = curr.slice(0, -1) || '0'; update(); };
  </script>
</body>
</html>`,
    },
];

const QUICK_PROMPTS = [
    { label: 'Button Effect', prompt: 'Create a button with amazing hover effects' },
    { label: 'Card Component', prompt: 'Design a modern card with shadow and animations' },
    { label: 'Loading Spinner', prompt: 'Build a creative loading animation' },
    { label: 'Modal Dialog', prompt: 'Create a popup modal with backdrop blur' },
    { label: 'Dark Mode Toggle', prompt: 'Make a smooth dark mode toggle switch' },
    { label: 'Image Gallery', prompt: 'Build an image gallery with lightbox' },
];

// ==================== Icons ====================
function LayoutIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
    );
}

function PlusCircleIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function CheckSquareIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
    );
}

function CalculatorIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
    );
}

function CodeIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
    );
}

function PlayIcon() {
    return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
        </svg>
    );
}

function SendIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
    );
}

function CopyIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    );
}

function DownloadIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );
}

function RefreshIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    );
}

function MaximizeIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
    );
}

function MinimizeIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function SplitIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
    );
}

function HistoryIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function TemplateIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
    );
}

function ShareIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
    );
}

function SparklesIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
    );
}

function LoaderIcon({ className = '' }: { className?: string }) {
    return (
        <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
    );
}

function ChevronDownIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    );
}

function FolderIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
    );
}

function KeyboardIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
    );
}

// ==================== Utility Functions ====================
const removeThinkTags = (text: string): string => {
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '');
    if (cleaned.includes('<think>')) {
        cleaned = cleaned.replace(/<think>[\s\S]*/g, '');
    }
    return cleaned.trim();
};

const extractCodeFromResponse = (text: string): string => {
    const codeMatch = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
    return codeMatch ? codeMatch[1].trim() : '';
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// ==================== Sub Components ====================

// 코드 에디터 컴포넌트
const CodeEditor: React.FC<{
    code: string;
    onChange: (code: string) => void;
    language: Language;
    theme: Theme;
    readOnly?: boolean;
}> = ({ code, onChange, language, theme, readOnly = false }) => {
    const preRef = useRef<HTMLPreElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [lineNumbers, setLineNumbers] = useState<number[]>([1]);

    useEffect(() => {
        const lines = code.split('\n').length;
        setLineNumbers(Array.from({ length: Math.max(lines, 20) }, (_, i) => i + 1));
    }, [code]);

    useEffect(() => {
        if (preRef.current) {
            const langConfig = LANGUAGE_CONFIG[language];
            try {
                const highlighted = Prism.highlight(
                    code || '',
                    Prism.languages[langConfig.prism] || Prism.languages.javascript,
                    langConfig.prism
                );
                preRef.current.innerHTML = highlighted || '&nbsp;';
            } catch {
                preRef.current.textContent = code;
            }
        }
    }, [code, language]);

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (preRef.current) {
            preRef.current.scrollTop = e.currentTarget.scrollTop;
            preRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    return (
        <div className="relative flex h-full font-mono text-sm" style={{ background: THEME_CONFIG[theme].editor }}>
            {/* Line numbers */}
            <div className="flex-shrink-0 w-12 py-4 pr-2 text-right select-none border-r border-gray-800">
                {lineNumbers.map(num => (
                    <div key={num} className="text-gray-600 text-xs leading-6">{num}</div>
                ))}
            </div>

            {/* Code area */}
            <div className="relative flex-1 overflow-hidden">
                <pre
                    ref={preRef}
                    className="absolute inset-0 p-4 overflow-auto whitespace-pre-wrap pointer-events-none leading-6"
                    style={{ color: '#e2e8f0' }}
                />
                <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={(e) => onChange(e.target.value)}
                    onScroll={handleScroll}
                    readOnly={readOnly}
                    spellCheck={false}
                    className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-white resize-none outline-none leading-6"
                    placeholder="// Start coding or let AI generate..."
                />
            </div>
        </div>
    );
};

// 미리보기 컴포넌트
const Preview: React.FC<{
    code: string;
    language: Language;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onRefresh: () => void;
}> = ({ code, language, isExpanded, onToggleExpand, onRefresh }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [key, setKey] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            updatePreview();
        }, 300);
        return () => clearTimeout(timer);
    }, [code, language, key]);

    const updatePreview = () => {
        const iframe = iframeRef.current;
        if (!iframe || !code.trim()) return;

        try {
            setError(null);
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!doc) return;

            let htmlContent = code;

            if (language === 'css') {
                htmlContent = `
                    <style>${code}</style>
                    <div class="demo">
                        <h2>CSS Preview</h2>
                        <button class="btn">Button</button>
                        <p>Sample text paragraph</p>
                        <div class="box">Box Element</div>
                    </div>
                `;
            } else if (language === 'javascript') {
                htmlContent = `
                    <div id="app"></div>
                    <script>
                        try {
                            ${code}
                        } catch(e) {
                            document.body.innerHTML = '<div style="color:#ef4444;padding:20px;font-family:monospace"><strong>Error:</strong> ' + e.message + '</div>';
                        }
                    </script>
                `;
            }

            const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: white;
        }
        button {
            padding: 12px 24px;
            border: none;
            border-radius: 12px;
            background: white;
            color: #667eea;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 5px;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        input, textarea, select {
            padding: 12px 16px;
            border: 2px solid rgba(255,255,255,0.2);
            border-radius: 12px;
            background: rgba(255,255,255,0.1);
            color: white;
            font-size: 14px;
            outline: none;
            transition: border-color 0.3s;
            margin: 5px;
        }
        input:focus, textarea:focus, select:focus {
            border-color: white;
        }
        input::placeholder, textarea::placeholder {
            color: rgba(255,255,255,0.5);
        }
        .demo {
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
        }
        .box {
            padding: 20px;
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            margin: 10px 0;
        }
        h1, h2, h3, h4 { margin-bottom: 15px; }
        p { margin-bottom: 10px; line-height: 1.6; }
        ul, ol { padding-left: 20px; margin-bottom: 15px; }
        li { margin-bottom: 8px; }
        a { color: #a5b4fc; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .container { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>${htmlContent}</body>
</html>`;

            doc.open();
            doc.write(fullHtml);
            doc.close();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleRefresh = () => {
        setKey(k => k + 1);
        onRefresh();
    };

    const containerClasses = isExpanded
        ? 'fixed inset-4 z-50 rounded-2xl overflow-hidden shadow-2xl'
        : 'flex-1 rounded-2xl overflow-hidden';

    return (
        <div className={containerClasses}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-gray-400">Live Preview</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleRefresh}
                        className="p-1.5 text-gray-500 hover:text-white rounded transition-colors"
                        title="Refresh"
                    >
                        <RefreshIcon />
                    </button>
                    <button
                        onClick={onToggleExpand}
                        className="p-1.5 text-gray-500 hover:text-white rounded transition-colors"
                        title={isExpanded ? 'Exit fullscreen' : 'Fullscreen'}
                    >
                        {isExpanded ? <MinimizeIcon /> : <MaximizeIcon />}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className={`relative ${isExpanded ? 'h-[calc(100%-40px)]' : 'h-full'}`}>
                {error ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 p-4">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <p className="text-red-400 font-medium mb-1">Preview Error</p>
                            <p className="text-gray-500 text-sm">{error}</p>
                        </div>
                    </div>
                ) : !code.trim() ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                                <PlayIcon />
                            </div>
                            <p className="text-gray-500">Preview will appear here</p>
                        </div>
                    </div>
                ) : (
                    <iframe
                        key={key}
                        ref={iframeRef}
                        title="Preview"
                        className="w-full h-full"
                        sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                        style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
                    />
                )}
            </div>

            {/* Backdrop for expanded mode */}
            {isExpanded && (
                <div
                    className="fixed inset-0 bg-black/80 -z-10"
                    onClick={onToggleExpand}
                />
            )}
        </div>
    );
};

// AI 채팅 패널
const AIChatPanel: React.FC<{
    messages: ChatMsg[];
    input: string;
    onInputChange: (value: string) => void;
    onSend: () => void;
    isGenerating: boolean;
    quickPrompts: typeof QUICK_PROMPTS;
    userCredits: number;
    isPro: boolean;
    quality: QualityLevel;
    onQualityChange: (q: QualityLevel) => void;
}> = ({
    messages,
    input,
    onInputChange,
    onSend,
    isGenerating,
    quickPrompts,
    userCredits,
    isPro,
    quality,
    onQualityChange
}) => {
        const messagesEndRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, [messages]);

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey && input.trim() && !isGenerating) {
                e.preventDefault();
                onSend();
            }
        };

        return (
            <div className="flex flex-col h-full bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-800">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <SparklesIcon />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-white">AI Assistant</h3>
                        <p className="text-xs text-gray-500">Describe what you want to create</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isPro ? (
                            <span className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full">
                                PRO
                            </span>
                        ) : (
                            <span className="text-xs text-indigo-400 font-mono font-bold">
                                {userCredits} CR
                            </span>
                        )}
                    </div>
                </div>

                {/* Quality Selector */}
                <div className="p-3 bg-gray-950/30 border-b border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">생성 품질 & 비용</span>
                        <span className="text-[10px] text-amber-500 font-bold">
                            {QUALITY_SETTINGS.find(q => q.id === quality)?.cost} CR
                        </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                        {QUALITY_SETTINGS.map((q) => (
                            <button
                                key={q.id}
                                onClick={() => onQualityChange(q.id)}
                                className={`flex flex-col items-center p-2 rounded-xl border transition-all ${quality === q.id
                                    ? 'border-indigo-500 bg-indigo-500/10'
                                    : 'border-gray-800 bg-gray-800/20 hover:border-gray-700'
                                    }`}
                                title={q.description}
                            >
                                <div
                                    className="w-1.5 h-1.5 rounded-full mb-1"
                                    style={{ backgroundColor: q.color, boxShadow: quality === q.id ? `0 0 8px ${q.color}` : 'none' }}
                                />
                                <span className={`text-[9px] font-bold ${quality === q.id ? 'text-white' : 'text-gray-500'}`}>
                                    {q.id.charAt(0).toUpperCase() + q.id.slice(1)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="space-y-4">
                            <div className="text-center py-8">
                                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                                    <CodeIcon />
                                </div>
                                <h4 className="font-bold text-white mb-2">Ready to code?</h4>
                                <p className="text-sm text-gray-500 max-w-[200px] mx-auto">
                                    Describe what you want to build and I'll generate the code for you.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">
                                    Quick prompts
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {quickPrompts.map((prompt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => onInputChange(prompt.prompt)}
                                            className="p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl text-left transition-colors group"
                                        >
                                            <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                                                {prompt.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-md'
                                        : 'bg-gray-800 text-gray-300 rounded-bl-md'
                                        }`}
                                >
                                    {msg.content}
                                    {msg.codeGenerated && (
                                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/10">
                                            <CheckIcon />
                                            <span className="text-xs opacity-70">Code generated</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-800">
                    <div className="relative">
                        <textarea
                            value={input}
                            onChange={(e) => onInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe what you want to create..."
                            disabled={isGenerating}
                            rows={2}
                            className="w-full px-4 py-3 pr-14 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 resize-none outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                        />
                        <button
                            onClick={onSend}
                            disabled={!input.trim() || isGenerating}
                            className="absolute right-2 bottom-2 w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center transition-colors"
                        >
                            {isGenerating ? (
                                <LoaderIcon className="w-5 h-5" />
                            ) : (
                                <SendIcon />
                            )}
                        </button>
                    </div>
                    {!isPro && (
                        <p className="text-center text-[10px] text-gray-600 mt-2">
                            50 CR per generation
                        </p>
                    )}
                </div>
            </div>
        );
    };

// 템플릿 선택 모달
const TemplateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (template: Template) => void;
}> = ({ isOpen, onClose, onSelect }) => {
    const [selectedCategory, setSelectedCategory] = useState('all');

    if (!isOpen) return null;

    const categories = ['all', ...new Set(TEMPLATES.map(t => t.category))];
    const filteredTemplates = selectedCategory === 'all'
        ? TEMPLATES
        : TEMPLATES.filter(t => t.category === selectedCategory);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-hidden animate-scaleIn">
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
                            <TemplateIcon />
                        </div>
                        <div>
                            <h2 className="font-bold text-white">Templates</h2>
                            <p className="text-xs text-gray-500">Start with a pre-built template</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    >
                        <MinimizeIcon />
                    </button>
                </div>

                {/* Categories */}
                <div className="flex gap-2 p-4 border-b border-gray-800 overflow-x-auto">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors ${selectedCategory === cat
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:text-white'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Templates Grid */}
                <div className="p-4 grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                    {filteredTemplates.map(template => (
                        <button
                            key={template.id}
                            onClick={() => {
                                onSelect(template);
                                onClose();
                            }}
                            className="p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl text-left transition-all group border border-gray-700 hover:border-indigo-500"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                                    {template.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{template.name}</h3>
                                    <span
                                        className="text-[10px] px-2 py-0.5 rounded"
                                        style={{ backgroundColor: LANGUAGE_CONFIG[template.language].color + '20', color: LANGUAGE_CONFIG[template.language].color }}
                                    >
                                        {LANGUAGE_CONFIG[template.language].label}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">{template.description}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// 게시 모달
const PublishModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onPublish: (title: string, type: 'community' | 'game') => Promise<void>;
    isPublishing: boolean;
}> = ({ isOpen, onClose, onPublish, isPublishing }) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<'community' | 'game'>('community');

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!title.trim()) return;
        await onPublish(title, type);
        setTitle('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm overflow-hidden animate-scaleIn">
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white">Publish Your Creation</h2>
                    <p className="text-sm text-gray-500 mt-1">Share with the community</p>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-400 block mb-2">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="My Awesome Creation"
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-400 block mb-2">Category</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setType('community')}
                                className={`p-4 rounded-xl border-2 transition-all ${type === 'community'
                                    ? 'border-indigo-500 bg-indigo-500/10'
                                    : 'border-gray-700 hover:border-gray-600'
                                    }`}
                            >
                                <CodeIcon />
                                <span className="text-sm font-medium text-white block mt-2">Code Gallery</span>
                            </button>
                            <button
                                onClick={() => setType('game')}
                                className={`p-4 rounded-xl border-2 transition-all ${type === 'game'
                                    ? 'border-green-500 bg-green-500/10'
                                    : 'border-gray-700 hover:border-gray-600'
                                    }`}
                            >
                                <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                </svg>
                                <span className="text-sm font-medium text-white block mt-2">Game Arcade</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                        <p className="text-xs text-yellow-400">
                            Content that violates community guidelines will be removed.
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-gray-800/50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!title.trim() || isPublishing}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {isPublishing ? (
                            <LoaderIcon className="w-5 h-5" />
                        ) : (
                            <>
                                <ShareIcon />
                                Publish
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// 히스토리 패널
const HistoryPanel: React.FC<{
    versions: CodeVersion[];
    onRestore: (version: CodeVersion) => void;
    isOpen: boolean;
    onClose: () => void;
}> = ({ versions, onRestore, isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute top-12 right-0 w-80 bg-gray-900 rounded-xl border border-gray-700 shadow-2xl z-20 overflow-hidden animate-slideDown">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <HistoryIcon />
                    Version History
                </h3>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-white transition-colors"
                >
                    <MinimizeIcon />
                </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
                {versions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">
                        No history yet
                    </div>
                ) : (
                    versions.map((version, idx) => (
                        <button
                            key={version.id}
                            onClick={() => onRestore(version)}
                            className="w-full p-4 hover:bg-gray-800 text-left transition-colors border-b border-gray-800 last:border-0"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-400">
                                    {idx === 0 ? 'Latest' : `Version ${versions.length - idx}`}
                                </span>
                                <span
                                    className="text-[10px] px-2 py-0.5 rounded"
                                    style={{ backgroundColor: LANGUAGE_CONFIG[version.language].color + '20', color: LANGUAGE_CONFIG[version.language].color }}
                                >
                                    {LANGUAGE_CONFIG[version.language].label}
                                </span>
                            </div>
                            <p className="text-sm text-white truncate">
                                {version.prompt || 'Manual edit'}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                                {version.timestamp.toLocaleTimeString()}
                            </p>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};

// ==================== Main Component ====================
const VibeCodePage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Core state
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState<Language>('html');
    const [theme, setTheme] = useState<Theme>('midnight');
    const [viewMode, setViewMode] = useState<ViewMode>('split');

    // Chat state
    const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // UI state
    const [copied, setCopied] = useState(false);
    const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [showHistoryPanel, setShowHistoryPanel] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    // History
    const [versions, setVersions] = useState<CodeVersion[]>([]);

    // Usage
    const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
    const [userCredits, setUserCredits] = useState(0);
    const [quality, setQuality] = useState<QualityLevel>('standard');

    const groqClient = getGroqClient();
    const isPro = user?.membership === 'pro';

    // Load usage info
    const loadUsageInfo = useCallback(async () => {
        const info = await UsageService.getUsageInfo(user?.id);
        setUsageInfo(info);
        if (user) {
            const credits = await UsageService.getUserCredits(user.id);
            setUserCredits(credits);
        }
    }, [user]);

    useEffect(() => {
        loadUsageInfo();
    }, [loadUsageInfo]);

    // Save to history when code changes
    useEffect(() => {
        if (code.trim() && versions.length > 0) {
            const lastVersion = versions[0];
            // Only save if significantly different
            if (Math.abs(lastVersion.code.length - code.length) > 50) {
                saveToHistory();
            }
        }
    }, [code]);

    const saveToHistory = useCallback((prompt?: string) => {
        const newVersion: CodeVersion = {
            id: generateId(),
            code,
            language,
            timestamp: new Date(),
            prompt,
        };
        setVersions(prev => [newVersion, ...prev].slice(0, 20));
    }, [code, language]);

    // Build system prompt
    const buildSystemPrompt = (): string => {
        const langConfig = LANGUAGE_CONFIG[language];
        const qualitySetting = QUALITY_SETTINGS.find(q => q.id === quality)!;

        let qualityInstructions = "";
        if (quality === 'masterpiece') {
            qualityInstructions = "CRITICAL: This is a MASTERPIECE request. Use advanced architectural patterns, modular structures, and state-of-the-art animations (GSAP-like behavior). The code must be production-ready and extremely polished.";
        } else if (quality === 'premium') {
            qualityInstructions = "Enhance the UI with rich animations, glassmorphism, and complex interactive elements. Ensure the logic handles edge cases.";
        } else if (quality === 'draft') {
            qualityInstructions = "Focus on a minimal working prototype. Keep it simple and direct.";
        }

        return `You are an expert ${langConfig.label} developer. Create beautiful, working code.
${qualityInstructions}

CRITICAL RULES:
1. Return ONLY a single code block - no explanations before or after
2. Code must be COMPLETE and RUNNABLE
3. For HTML: include ALL CSS and JavaScript inline in the same file
4. Make it VISUALLY IMPRESSIVE:
   - Use gradients (linear-gradient, radial-gradient)
   - Add smooth transitions and animations
   - Modern design with rounded corners, shadows
   - Good color palette (avoid plain colors)
5. Write EFFICIENT code - complete but not bloated
6. Every feature must ACTUALLY WORK
7. NEVER use placeholder comments
8. NO <think> tags

Format:
\`\`\`${langConfig.prism}
// your complete code here
\`\`\``;
    };

    // Generate code
    const handleGenerate = async () => {
        const currentQuality = QUALITY_SETTINGS.find(q => q.id === quality)!;
        const COST = currentQuality.cost;

        if (!user) {
            alert('Please login to use AI generation');
            navigate('/login');
            return;
        }

        if (!isPro) {
            if (userCredits < COST) {
                alert(`Not enough credits. ${currentQuality.label} requires ${COST} CR.`);
                navigate('/shop');
                return;
            }

            const success = await UsageService.consumeCredits(user.id, COST);
            if (!success) {
                alert('Failed to consume credits');
                return;
            }
            setUserCredits(prev => prev - COST);
        }

        const userMessage = input.trim();
        setInput('');
        setError(null);

        const userMsgId = generateId();
        setChatMessages(prev => [...prev, {
            id: userMsgId,
            role: 'user',
            content: userMessage,
            timestamp: new Date(),
        }]);

        setIsGenerating(true);

        const assistantMsgId = generateId();
        setChatMessages(prev => [...prev, {
            id: assistantMsgId,
            role: 'assistant',
            content: `Generating ${currentQuality.label} code...`,
            timestamp: new Date(),
        }]);

        try {
            const messages: ChatMessage[] = [
                { role: 'system', content: buildSystemPrompt() },
                { role: 'user', content: userMessage }
            ];

            let fullResponse = '';
            await groqClient.streamChat(
                {
                    model: 'openai/gpt-oss-120b',
                    messages,
                    max_tokens: currentQuality.tokens,
                    temperature: currentQuality.temp,
                },
                (delta, fullText) => {
                    const cleanText = removeThinkTags(fullText);
                    fullResponse = cleanText;
                    const extractedCode = extractCodeFromResponse(cleanText);
                    if (extractedCode) {
                        setCode(extractedCode);
                    }
                }
            );

            const finalCode = extractCodeFromResponse(fullResponse);
            if (finalCode) {
                setCode(finalCode);
                saveToHistory(userMessage);
                setChatMessages(prev => prev.map(msg =>
                    msg.id === assistantMsgId
                        ? { ...msg, content: 'Code generated successfully!', codeGenerated: true }
                        : msg
                ));
            } else {
                setChatMessages(prev => prev.map(msg =>
                    msg.id === assistantMsgId
                        ? { ...msg, content: 'Failed to generate. Please try again.' }
                        : msg
                ));
            }
        } catch (err: any) {
            console.error('Generation error:', err);
            setError(err.message || 'Failed to generate code');
            setChatMessages(prev => prev.filter(msg => msg.id !== assistantMsgId));
        } finally {
            setIsGenerating(false);
            loadUsageInfo();
        }
    };

    // Publish
    const handlePublish = async (title: string, type: 'community' | 'game') => {
        if (!user || !code.trim()) return;
        setIsPublishing(true);

        try {
            const postData = {
                title,
                code,
                language,
                authorId: user.id,
                authorName: user.nickname || user.email?.split('@')[0] || 'Anonymous',
                createdAt: Timestamp.now(),
                plays: 0,
                likes: 0,
                views: 0,
            };

            const collectionName = type === 'game' ? 'user_games' : 'vibe_code_gallery';
            await addDoc(collection(db, collectionName), postData);

            alert(`Published to ${type === 'game' ? 'Game Arcade' : 'Code Gallery'}!`);
            setShowPublishModal(false);
        } catch (err) {
            console.error('Publish error:', err);
            alert('Failed to publish');
        } finally {
            setIsPublishing(false);
        }
    };

    // Actions
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const langConfig = LANGUAGE_CONFIG[language];
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vibe-code.${langConfig.ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClear = () => {
        if (code.trim() && !confirm('Clear all code?')) return;
        setCode('');
        setChatMessages([]);
        setError(null);
    };

    const handleTemplateSelect = (template: Template) => {
        setCode(template.code);
        setLanguage(template.language);
        saveToHistory(`Template: ${template.name}`);
    };

    const handleRestoreVersion = (version: CodeVersion) => {
        setCode(version.code);
        setLanguage(version.language);
        setShowHistoryPanel(false);
    };

    // Not logged in
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                        <CodeIcon />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Vibe Code</h1>
                    <p className="text-gray-500 mb-6">
                        AI-powered code generation. Describe what you want to build and watch it come to life.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
                    >
                        Login to Start
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ background: THEME_CONFIG[theme].bg }}>
            {/* Header */}
            <header className="h-14 border-b border-gray-800 flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <CodeIcon />
                        </div>
                        <span className="font-bold text-white hidden sm:block">Vibe Code</span>
                        <span className="px-1.5 py-0.5 bg-amber-500 text-amber-950 text-[9px] font-bold rounded">BETA</span>
                    </div>

                    {/* Language Selector */}
                    <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg">
                        {Object.entries(LANGUAGE_CONFIG).slice(0, 5).map(([key, config]) => (
                            <button
                                key={key}
                                onClick={() => setLanguage(key as Language)}
                                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${language === key
                                    ? 'bg-white/10 text-white'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                style={language === key ? { borderBottom: `2px solid ${config.color}` } : {}}
                            >
                                {config.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Mode */}
                    <div className="hidden md:flex gap-1 bg-gray-800/50 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('code')}
                            className={`p-1.5 rounded ${viewMode === 'code' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                            title="Code only"
                        >
                            <CodeIcon />
                        </button>
                        <button
                            onClick={() => setViewMode('split')}
                            className={`p-1.5 rounded ${viewMode === 'split' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                            title="Split view"
                        >
                            <SplitIcon />
                        </button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`p-1.5 rounded ${viewMode === 'preview' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                            title="Preview only"
                        >
                            <PlayIcon />
                        </button>
                    </div>

                    {/* Actions */}
                    <button
                        onClick={() => setShowTemplateModal(true)}
                        className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                        title="Templates"
                    >
                        <TemplateIcon />
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                            className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                            title="History"
                        >
                            <HistoryIcon />
                        </button>
                        <HistoryPanel
                            versions={versions}
                            onRestore={handleRestoreVersion}
                            isOpen={showHistoryPanel}
                            onClose={() => setShowHistoryPanel(false)}
                        />
                    </div>

                    {code && (
                        <button
                            onClick={() => setShowPublishModal(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            <ShareIcon />
                            <span className="hidden sm:inline">Publish</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Editor & Preview */}
                <div className="flex-1 flex flex-col lg:flex-row gap-2 p-2 overflow-hidden">
                    {/* Code Editor */}
                    {(viewMode === 'code' || viewMode === 'split') && (
                        <div className={`flex flex-col rounded-2xl border border-gray-800 overflow-hidden ${viewMode === 'split' ? 'flex-1' : 'flex-1'}`}>
                            {/* Editor Header */}
                            <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                    </div>
                                    <span className="text-xs text-gray-500 font-mono">
                                        main.{LANGUAGE_CONFIG[language].ext}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleCopy}
                                        disabled={!code}
                                        className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30 rounded transition-colors"
                                        title="Copy"
                                    >
                                        {copied ? <CheckIcon /> : <CopyIcon />}
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        disabled={!code}
                                        className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30 rounded transition-colors"
                                        title="Download"
                                    >
                                        <DownloadIcon />
                                    </button>
                                    <button
                                        onClick={handleClear}
                                        className="p-1.5 text-gray-500 hover:text-red-400 rounded transition-colors"
                                        title="Clear"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>

                            {/* Editor Content */}
                            <div className="flex-1 overflow-hidden">
                                <CodeEditor
                                    code={code}
                                    onChange={setCode}
                                    language={language}
                                    theme={theme}
                                />
                            </div>
                        </div>
                    )}

                    {/* Preview */}
                    {(viewMode === 'preview' || viewMode === 'split') && (language === 'html' || language === 'css' || language === 'javascript') && (
                        <Preview
                            code={code}
                            language={language}
                            isExpanded={isPreviewExpanded}
                            onToggleExpand={() => setIsPreviewExpanded(!isPreviewExpanded)}
                            onRefresh={() => { }}
                        />
                    )}
                </div>

                {/* Right: AI Chat */}
                <div className="w-full lg:w-80 p-2 flex-shrink-0">
                    <AIChatPanel
                        messages={chatMessages}
                        input={input}
                        onInputChange={setInput}
                        onSend={handleGenerate}
                        isGenerating={isGenerating}
                        quickPrompts={QUICK_PROMPTS}
                        userCredits={userCredits}
                        isPro={isPro}
                        quality={quality}
                        onQualityChange={setQuality}
                    />
                </div>
            </div>

            {/* Modals */}
            <TemplateModal
                isOpen={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                onSelect={handleTemplateSelect}
            />

            <PublishModal
                isOpen={showPublishModal}
                onClose={() => setShowPublishModal(false)}
                onPublish={handlePublish}
                isPublishing={isPublishing}
            />

            {/* Error Toast */}
            {error && (
                <div className="fixed bottom-4 right-4 z-50 bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slideUp">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm">{error}</span>
                    <button onClick={() => setError(null)} className="ml-2">
                        <MinimizeIcon />
                    </button>
                </div>
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
                .animate-slideUp { animation: slideUp 0.2s ease-out; }
                .animate-slideDown { animation: slideDown 0.2s ease-out; }
            `}</style>
        </div>
    );
};

export default VibeCodePage;