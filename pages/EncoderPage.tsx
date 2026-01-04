
import React, { useState, useRef, useCallback } from 'react';
import { Lock, Unlock, FileText, Image, Music, Video, Copy, Download, ChevronDown } from 'lucide-react';

// 모스 부호 매핑
const morseCode: Record<string, string> = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
  'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
  'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
  '6': '-....', '7': '--...', '8': '---..', '9': '----.', ' ': '/'
};
const reverseMorse: Record<string, string> = Object.fromEntries(Object.entries(morseCode).map(([k, v]) => [v, k]));

type InputType = 'text' | 'image' | 'audio' | 'video';
type EncodeMethod = 'unicode' | 'base64' | 'binary' | 'hex' | 'url' | 'html' | 'morse' | 'rot13' | 'caesar' | 'reverse';
type DecodeMethod = 'auto' | EncodeMethod;

const EncoderPage: React.FC = () => {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [inputType, setInputType] = useState<InputType>('text');
  const [encodeMethod, setEncodeMethod] = useState<EncodeMethod>('unicode');
  const [decodeMethod, setDecodeMethod] = useState<DecodeMethod>('auto');
  const [decodeType, setDecodeType] = useState<'text' | 'file'>('text');
  const [inputText, setInputText] = useState('');
  const [decodeInput, setDecodeInput] = useState('');
  const [base64Input, setBase64Input] = useState('');
  const [fileType, setFileType] = useState('auto');
  const [caesarShift, setCaesarShift] = useState(3);
  const [result, setResult] = useState<string | null>(null);
  const [resultType, setResultType] = useState<'text' | 'media'>('text');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; icon: string }>({ show: false, message: '', icon: '✓' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, icon = '✓') => {
    setToast({ show: true, message, icon });
    setTimeout(() => setToast({ show: false, message: '', icon: '✓' }), 2000);
  };

  // 인코딩 함수
  const encodeText = (text: string, method: EncodeMethod): string => {
    switch (method) {
      case 'unicode':
        return [...text].map(c => 'U+' + (c.codePointAt(0) || 0).toString(16).toUpperCase().padStart(4, '0')).join(' ');
      case 'base64':
        return btoa(unescape(encodeURIComponent(text)));
      case 'binary':
        return [...text].map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
      case 'hex':
        return [...text].map(c => c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join(' ');
      case 'url':
        return encodeURIComponent(text);
      case 'html':
        return [...text].map(c => '&#' + (c.codePointAt(0) || 0) + ';').join('');
      case 'morse':
        return text.toUpperCase().split('').map(c => morseCode[c] || c).join(' ');
      case 'rot13':
        return text.replace(/[a-zA-Z]/g, c => String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c.charCodeAt(0) + 13) ? c.charCodeAt(0) + 13 : c.charCodeAt(0) - 13));
      case 'caesar':
        return text.replace(/[a-zA-Z]/g, c => {
          const base = c <= 'Z' ? 65 : 97;
          return String.fromCharCode((c.charCodeAt(0) - base + caesarShift) % 26 + base);
        });
      case 'reverse':
        return [...text].reverse().join('');
      default:
        return text;
    }
  };

  // 디코딩 함수
  const decodeText = (text: string, method: DecodeMethod): string | null => {
    try {
      switch (method) {
        case 'auto':
          if (text.includes('U+')) return decodeText(text, 'unicode');
          if (/^[01\s]+$/.test(text)) return decodeText(text, 'binary');
          if (/^[0-9A-Fa-f\s]+$/.test(text) && text.replace(/\s/g, '').length % 2 === 0) return decodeText(text, 'hex');
          if (/^[.\-\/\s]+$/.test(text)) return decodeText(text, 'morse');
          if (/&#\d+;/.test(text)) return decodeText(text, 'html');
          if (/%[0-9A-Fa-f]{2}/.test(text)) return decodeText(text, 'url');
          try { return decodeText(text, 'base64'); } catch { return text; }
        case 'unicode':
          return text.match(/U\+([0-9A-Fa-f]{4,6})/g)?.map(m => String.fromCodePoint(parseInt(m.slice(2), 16))).join('') || text;
        case 'base64':
          return decodeURIComponent(escape(atob(text)));
        case 'binary':
          return text.split(/\s+/).map(b => String.fromCharCode(parseInt(b, 2))).join('');
        case 'hex':
          return text.split(/\s+/).map(h => String.fromCharCode(parseInt(h, 16))).join('');
        case 'url':
          return decodeURIComponent(text);
        case 'html':
          return text.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n)));
        case 'morse':
          return text.split(' ').map(m => reverseMorse[m] || m).join('');
        case 'rot13':
          return text.replace(/[a-zA-Z]/g, c => String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c.charCodeAt(0) + 13) ? c.charCodeAt(0) + 13 : c.charCodeAt(0) - 13));
        case 'caesar':
          return text.replace(/[a-zA-Z]/g, c => {
            const base = c <= 'Z' ? 65 : 97;
            return String.fromCharCode((c.charCodeAt(0) - base - caesarShift + 26) % 26 + base);
          });
        case 'reverse':
          return [...text].reverse().join('');
        default:
          return text;
      }
    } catch {
      return null;
    }
  };

  // 변환 실행
  const handleConvert = () => {
    if (inputType === 'text') {
      if (!inputText) return showToast('텍스트를 입력하세요', '⚠️');
      const encoded = encodeText(inputText, encodeMethod);
      setResult(encoded);
      setResultType('text');
    } else {
      if (!uploadedFile) return showToast('파일을 선택하세요', '⚠️');
      const reader = new FileReader();
      reader.onload = e => {
        setResult(e.target?.result as string);
        setResultType('text');
      };
      reader.readAsDataURL(uploadedFile);
    }
  };

  // 복원 실행
  const handleDecode = () => {
    if (decodeType === 'text') {
      if (!decodeInput.trim()) return showToast('코드를 입력하세요', '⚠️');
      const decoded = decodeText(decodeInput.trim(), decodeMethod);
      if (!decoded) return showToast('복원할 수 없습니다', '⚠️');
      setResult(decoded);
      setResultType('text');
    } else {
      let input = base64Input.trim();
      if (!input) return showToast('코드를 입력하세요', '⚠️');
      if (!input.startsWith('data:')) {
        if (fileType === 'auto') return showToast('파일 타입을 선택하세요', '⚠️');
        input = `data:${fileType};base64,${input}`;
      }
      setResult(input);
      setResultType('media');
    }
  };

  // 파일 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
    }
  };

  // 복사
  const handleCopy = async () => {
    if (result) {
      await navigator.clipboard.writeText(result);
      showToast('복사되었습니다');
    }
  };

  // 드롭 핸들러
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploadedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
    }
  }, []);

  const methods: { id: EncodeMethod; label: string }[] = [
    { id: 'unicode', label: '유니코드' },
    { id: 'base64', label: 'Base64' },
    { id: 'binary', label: '이진수' },
    { id: 'hex', label: '16진수' },
    { id: 'url', label: 'URL' },
    { id: 'html', label: 'HTML' },
    { id: 'morse', label: '모스부호' },
    { id: 'rot13', label: 'ROT13' },
    { id: 'caesar', label: '시저암호' },
    { id: 'reverse', label: '뒤집기' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 헤더 배너 */}
      <div className="p-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🔐</div>
          <div>
            <h1 className="text-2xl font-black text-white">유니코드 & 암호화 변환기</h1>
            <p className="text-indigo-100 text-sm">텍스트 · 이미지 · 오디오 · 동영상</p>
          </div>
        </div>
      </div>

      {/* 모드 스위치 */}
      <div className="flex justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg inline-flex border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setMode('encode')}
            className={`px-5 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 transition-all ${
              mode === 'encode'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Lock size={14} /> 변환
          </button>
          <button
            onClick={() => setMode('decode')}
            className={`px-5 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 transition-all ${
              mode === 'decode'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Unlock size={14} /> 복원
          </button>
        </div>
      </div>

      {/* 메인 카드 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
        {mode === 'encode' ? (
          <>
            {/* 입력 타입 선택 */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              {[
                { id: 'text' as InputType, icon: <FileText size={20} />, label: '텍스트' },
                { id: 'image' as InputType, icon: <Image size={20} />, label: '이미지' },
                { id: 'audio' as InputType, icon: <Music size={20} />, label: '오디오' },
                { id: 'video' as InputType, icon: <Video size={20} />, label: '동영상' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => { setInputType(t.id); setUploadedFile(null); setFilePreviewUrl(null); }}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
                    inputType === t.id
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
                  }`}
                >
                  {t.icon}
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>

            {/* 변환 방식 선택 (텍스트만) */}
            {inputType === 'text' && (
              <div className="mb-5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                  ⚙️ 변환 방식
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {methods.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setEncodeMethod(m.id)}
                      className={`text-xs py-2 px-2 rounded-lg border-2 font-medium transition-all ${
                        encodeMethod === m.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {encodeMethod === 'caesar' && (
                  <div className="mt-3 flex items-center gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-xl">
                    <span className="text-sm dark:text-gray-300">이동 값:</span>
                    <input
                      type="range"
                      min="1"
                      max="25"
                      value={caesarShift}
                      onChange={e => setCaesarShift(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 w-6">{caesarShift}</span>
                  </div>
                )}
              </div>
            )}

            {/* 텍스트 입력 */}
            {inputType === 'text' ? (
              <div>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  rows={4}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-2xl resize-none text-base bg-white dark:bg-gray-700 dark:text-white focus:border-indigo-500 outline-none"
                  placeholder="변환할 텍스트를 입력하세요"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {['안녕하세요', 'Hello World', '1234567890'].map(ex => (
                    <button
                      key={ex}
                      onClick={() => setInputText(ex)}
                      className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-all"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* 파일 입력 */
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-500 transition-all"
              >
                {uploadedFile ? (
                  <div>
                    {inputType === 'image' && filePreviewUrl && (
                      <img src={filePreviewUrl} alt="preview" className="max-h-20 rounded-xl mx-auto mb-3" />
                    )}
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{uploadedFile.name}</p>
                    <p className="text-xs text-gray-400">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                    <button
                      onClick={e => { e.stopPropagation(); setUploadedFile(null); setFilePreviewUrl(null); }}
                      className="mt-2 text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      ✕ 제거
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-5xl mb-3">{inputType === 'image' ? '🖼️' : inputType === 'audio' ? '🎵' : '🎬'}</div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">클릭 또는 파일을 드래그하세요</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={inputType === 'image' ? 'image/*' : inputType === 'audio' ? 'audio/*' : 'video/*'}
                  onChange={handleFileChange}
                />
              </div>
            )}

            {/* 변환 버튼 */}
            <button
              onClick={handleConvert}
              className="w-full mt-5 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-2xl shadow-lg hover:opacity-90 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              ✨ 변환하기
            </button>
          </>
        ) : (
          /* 복원 모드 */
          <>
            {/* 복원 타입 선택 */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                onClick={() => setDecodeType('text')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                  decodeType === 'text'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                <FileText size={18} />
                <span className="text-sm font-medium">코드→텍스트</span>
              </button>
              <button
                onClick={() => setDecodeType('file')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                  decodeType === 'file'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Image size={18} />
                <span className="text-sm font-medium">코드→파일</span>
              </button>
            </div>

            {/* 복원 방식 선택 */}
            {decodeType === 'text' && (
              <div className="mb-5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                  ⚙️ 복원 방식
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[{ id: 'auto' as DecodeMethod, label: '🔍 자동' }, ...methods].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setDecodeMethod(m.id)}
                      className={`text-xs py-2 px-2 rounded-lg border-2 font-medium transition-all ${
                        decodeMethod === m.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 입력 영역 */}
            {decodeType === 'text' ? (
              <textarea
                value={decodeInput}
                onChange={e => setDecodeInput(e.target.value)}
                rows={4}
                className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-2xl resize-none text-sm font-mono bg-white dark:bg-gray-700 dark:text-white focus:border-indigo-500 outline-none"
                placeholder="변환된 코드를 붙여넣으세요"
              />
            ) : (
              <div>
                <textarea
                  value={base64Input}
                  onChange={e => setBase64Input(e.target.value)}
                  rows={4}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-2xl resize-none text-xs font-mono bg-white dark:bg-gray-700 dark:text-white focus:border-indigo-500 outline-none"
                  placeholder="Base64 코드를 붙여넣으세요"
                />
                <select
                  value={fileType}
                  onChange={e => setFileType(e.target.value)}
                  className="w-full mt-3 p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-white"
                >
                  <option value="auto">🔍 자동 감지</option>
                  <option value="image/png">🖼️ PNG</option>
                  <option value="image/jpeg">🖼️ JPEG</option>
                  <option value="audio/mp3">🎵 MP3</option>
                  <option value="video/mp4">🎬 MP4</option>
                </select>
              </div>
            )}

            {/* 복원 버튼 */}
            <button
              onClick={handleDecode}
              className="w-full mt-5 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-2xl shadow-lg hover:opacity-90 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              🔓 복원하기
            </button>
          </>
        )}
      </div>

      {/* 결과 카드 */}
      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">✅</span>
              결과
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                title="복사"
              >
                <Copy size={18} className="text-gray-500" />
              </button>
            </div>
          </div>
          {resultType === 'text' ? (
            <textarea
              value={result}
              readOnly
              rows={5}
              className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl resize-none font-mono text-sm dark:text-white"
            />
          ) : (
            <div className="flex justify-center items-center p-6 bg-gray-50 dark:bg-gray-700 rounded-2xl">
              {result.includes('image') && <img src={result} alt="result" className="max-w-full max-h-56 rounded-xl" />}
              {result.includes('audio') && <audio src={result} controls />}
              {result.includes('video') && <video src={result} controls className="max-w-full max-h-56 rounded-xl" />}
            </div>
          )}
        </div>
      )}

      {/* 토스트 */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2 text-sm font-medium z-50 transition-all ${
          toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <span>{toast.icon}</span>
        <span>{toast.message}</span>
      </div>
    </div>
  );
};

export default EncoderPage;
