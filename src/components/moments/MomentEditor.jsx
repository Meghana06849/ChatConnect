import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const PRESET_FILTERS = {
  none: { brightness: 100, contrast: 100, saturation: 100, css: '' },
  warm: { brightness: 108, contrast: 104, saturation: 118, css: 'sepia(0.2) hue-rotate(-8deg)' },
  cool: { brightness: 96, contrast: 106, saturation: 110, css: 'hue-rotate(18deg)' },
  vintage: { brightness: 95, contrast: 90, saturation: 80, css: 'sepia(0.35) contrast(0.9)' },
  bw: { brightness: 102, contrast: 108, saturation: 0, css: 'grayscale(1)' },
};

const DEFAULT_STICKERS = ['😍', '🔥', '💖', '✨', '🎵', '🌈', '😂', '🥰'];
const DEFAULT_MUSIC = [
  { id: 'song-1', title: 'Sunset Hearts', artist: 'Aural Bloom', duration: 28, category: 'song', mood: 'romantic' },
  { id: 'song-2', title: 'Slow Spark', artist: 'Moonline', duration: 30, category: 'song', mood: 'chill' },
  { id: 'song-3', title: 'Neon Crush', artist: 'Pulse Echo', duration: 26, category: 'song', mood: 'hype' },
  { id: 'song-4', title: 'Midnight Note', artist: 'Velvet Lane', duration: 29, category: 'song', mood: 'romantic' },
  { id: 'song-5', title: 'Golden Pulse', artist: 'Nova Hearts', duration: 24, category: 'song', mood: 'hype' },
  { id: 'bgm-1', title: 'Soft Rain Room', artist: 'Ambient Lab', duration: 30, category: 'bgm', mood: 'chill' },
  { id: 'bgm-2', title: 'Cafe Breeze', artist: 'Loft Tones', duration: 30, category: 'bgm', mood: 'chill' },
  { id: 'bgm-3', title: 'Night Drive Pad', artist: 'Neon Drift', duration: 30, category: 'bgm', mood: 'hype' },
  { id: 'bgm-4', title: 'Dreamy Piano Bed', artist: 'Ivory Echo', duration: 30, category: 'bgm', mood: 'romantic' },
  { id: 'bgm-5', title: 'Ocean Air Loop', artist: 'Blue Current', duration: 30, category: 'bgm', mood: 'chill' },
];

const uid = () => Math.random().toString(36).slice(2);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function DraggableLayerItem({ item, onMove, onRemove, children }) {
  const dragRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const onPointerDown = (e) => {
    e.stopPropagation();
    const rect = dragRef.current?.parentElement?.getBoundingClientRect();
    if (!rect) return;
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      px: item.x,
      py: item.y,
    };
    dragRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragRef.current?.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    onMove(item.id, {
      x: clamp(startRef.current.px + dx, 0, 100),
      y: clamp(startRef.current.py + dy, 0, 100),
    });
  };

  const onPointerUp = (e) => {
    if (dragRef.current?.hasPointerCapture(e.pointerId)) {
      dragRef.current.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      ref={dragRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="absolute cursor-move select-none"
      style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)' }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
        className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-black/70 text-[10px] text-white"
      >
        x
      </button>
      {children}
    </div>
  );
}

export default function MomentEditor({
  file,
  onCancel,
  onSave,
  initialPrivacy = 'friends',
}) {
  const [activeTool, setActiveTool] = useState('filters');
  const [filterKey, setFilterKey] = useState('none');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [cropRatio, setCropRatio] = useState('9:16');
  const [privacy, setPrivacy] = useState(initialPrivacy);
  const [specificUsers, setSpecificUsers] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(28);
  const [drawColor, setDrawColor] = useState('#ff4d6d');
  const [isDrawing, setIsDrawing] = useState(false);
  const [musicList, setMusicList] = useState(DEFAULT_MUSIC);
  const [musicCategory, setMusicCategory] = useState('all');
  const [musicMoodPreset, setMusicMoodPreset] = useState('all');
  const [musicSearchQuery, setMusicSearchQuery] = useState('');
  const [musicTrack, setMusicTrack] = useState(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewSecondsLeft, setPreviewSecondsLeft] = useState(10);
  const [musicVolume, setMusicVolume] = useState(70);
  const [musicTrimStart, setMusicTrimStart] = useState(0);
  const [musicTrimEnd, setMusicTrimEnd] = useState(15);
  const [textOverlays, setTextOverlays] = useState([]);
  const [stickers, setStickers] = useState([]);

  const [previewUrl, setPreviewUrl] = useState('');
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const previewAudioRef = useRef(null);
  const previewTimeoutRef = useRef(null);
  const previewTickerRef = useRef(null);
  const previewOscillatorRef = useRef(null);
  const previewGainRef = useRef(null);
  const audioContextRef = useRef(null);

  const isVideo = file?.type?.startsWith('video/');

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) window.clearTimeout(previewTimeoutRef.current);
      if (previewTickerRef.current) window.clearInterval(previewTickerRef.current);
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
      if (previewOscillatorRef.current) {
        try {
          previewOscillatorRef.current.stop();
        } catch {
          // no-op
        }
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const preset = PRESET_FILTERS[filterKey] || PRESET_FILTERS.none;
    setBrightness(preset.brightness);
    setContrast(preset.contrast);
    setSaturation(preset.saturation);
  }, [filterKey]);

  useEffect(() => {
    if (isVideo) return;
    const canvas = previewCanvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const ratio = cropRatio === '1:1' ? 1 : cropRatio === '4:5' ? 4 / 5 : 9 / 16;
    const cw = rect.width;
    const ch = rect.height;
    let drawW = cw;
    let drawH = cw / ratio;
    if (drawH > ch) {
      drawH = ch;
      drawW = ch * ratio;
    }

    const ox = (cw - drawW) / 2;
    const oy = (ch - drawH) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, drawW, drawH);
    ctx.clip();

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${PRESET_FILTERS[filterKey].css}`;
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    const imageRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = drawW / drawH;
    let w = drawW;
    let h = drawH;

    if (imageRatio > targetRatio) {
      h = drawH;
      w = h * imageRatio;
    } else {
      w = drawW;
      h = w / imageRatio;
    }

    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    ctx.restore();
  }, [brightness, contrast, saturation, rotation, scale, cropRatio, previewUrl, filterKey, isVideo]);

  const visualStyle = useMemo(() => {
    const css = PRESET_FILTERS[filterKey]?.css || '';
    return {
      transform: `rotate(${rotation}deg) scale(${scale})`,
      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${css}`,
    };
  }, [filterKey, brightness, contrast, saturation, rotation, scale]);

  const filteredMusicList = useMemo(() => {
    const q = musicSearchQuery.trim().toLowerCase();
    return musicList.filter((track) => {
      const categoryMatch = musicCategory === 'all' || track.category === musicCategory;
      const moodMatch = musicMoodPreset === 'all' || track.mood === musicMoodPreset;
      const queryMatch = !q || `${track.title} ${track.artist}`.toLowerCase().includes(q);
      return categoryMatch && moodMatch && queryMatch;
    });
  }, [musicCategory, musicMoodPreset, musicSearchQuery, musicList]);

  const stopPreview = () => {
    if (previewTimeoutRef.current) {
      window.clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    if (previewTickerRef.current) {
      window.clearInterval(previewTickerRef.current);
      previewTickerRef.current = null;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current = null;
    }
    if (previewOscillatorRef.current) {
      try {
        previewOscillatorRef.current.stop();
      } catch {
        // no-op
      }
      previewOscillatorRef.current.disconnect();
      previewOscillatorRef.current = null;
    }
    if (previewGainRef.current) {
      previewGainRef.current.disconnect();
      previewGainRef.current = null;
    }
    setIsPreviewPlaying(false);
    setPreviewSecondsLeft(10);
  };

  const startPreview = async () => {
    if (!musicTrack) return;
    stopPreview();

    let endAt = Date.now() + 10000;

    if (musicTrack.src) {
      const audio = new Audio(musicTrack.src);
      audio.volume = musicVolume / 100;
      previewAudioRef.current = audio;
      try {
        await audio.play();
      } catch {
        stopPreview();
        return;
      }
    } else {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioCtx();
      }

      const moodFrequency = musicTrack.mood === 'hype' ? 220 : musicTrack.mood === 'romantic' ? 174 : 196;
      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();
      osc.type = musicTrack.category === 'bgm' ? 'sine' : 'triangle';
      osc.frequency.value = moodFrequency;
      gain.gain.value = Math.max(0.01, (musicVolume / 100) * 0.06);
      osc.connect(gain);
      gain.connect(audioContextRef.current.destination);
      osc.start();
      previewOscillatorRef.current = osc;
      previewGainRef.current = gain;
    }

    setIsPreviewPlaying(true);
    setPreviewSecondsLeft(10);

    previewTickerRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setPreviewSecondsLeft(remaining);
    }, 250);

    previewTimeoutRef.current = window.setTimeout(() => {
      stopPreview();
    }, 10000);
  };

  const togglePreview = async () => {
    if (isPreviewPlaying) {
      stopPreview();
      return;
    }
    await startPreview();
  };

  const groupedMusicList = useMemo(() => {
    return {
      songs: filteredMusicList.filter((track) => track.category === 'song'),
      bgms: filteredMusicList.filter((track) => track.category === 'bgm'),
      other: filteredMusicList.filter((track) => track.category !== 'song' && track.category !== 'bgm'),
    };
  }, [filteredMusicList]);

  const addText = () => {
    if (!textInput.trim()) return;
    setTextOverlays((prev) => [
      ...prev,
      {
        id: uid(),
        text: textInput.trim(),
        x: 50,
        y: 50,
        color: textColor,
        size: textSize,
      },
    ]);
    setTextInput('');
  };

  const addSticker = (emoji) => {
    setStickers((prev) => [...prev, { id: uid(), emoji, x: 50, y: 50 }]);
  };

  const updateTextPosition = (id, pos) => {
    setTextOverlays((prev) => prev.map((t) => (t.id === id ? { ...t, ...pos } : t)));
  };

  const updateStickerPosition = (id, pos) => {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, ...pos } : s)));
  };

  const removeText = (id) => setTextOverlays((prev) => prev.filter((t) => t.id !== id));
  const removeSticker = (id) => setStickers((prev) => prev.filter((s) => s.id !== id));

  const onDrawStart = (e) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const onDrawMove = (e) => {
    if (!isDrawing) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const onDrawEnd = () => setIsDrawing(false);

  const clearDrawing = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const onMusicUpload = async (e) => {
    const audioFile = e.target.files?.[0];
    if (!audioFile) return;
    const local = URL.createObjectURL(audioFile);
    const uploadCategory = musicCategory === 'bgm' ? 'bgm' : 'song';
    const track = {
      id: uid(),
      title: audioFile.name.replace(/\.[^/.]+$/, ''),
      artist: 'Uploaded',
      duration: 30,
      category: uploadCategory,
      mood: musicMoodPreset === 'all' ? 'custom' : musicMoodPreset,
      src: local,
    };
    setMusicList((prev) => [track, ...prev]);
    setMusicTrack(track);
  };

  const resetMusicSelection = () => {
    stopPreview();
    setMusicTrack(null);
    setMusicVolume(70);
    setMusicTrimStart(0);
    setMusicTrimEnd(15);
  };

  const handleSave = async () => {
    stopPreview();
    const drawingData = drawingCanvasRef.current?.toDataURL('image/png') || null;
    const payload = {
      file,
      privacy,
      specificUsers: specificUsers
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      editMeta: {
        filterKey,
        brightness,
        contrast,
        saturation,
        rotation,
        scale,
        cropRatio,
        textOverlays,
        stickers,
        drawingData,
      },
      music: musicTrack
        ? {
            id: musicTrack.id,
            title: musicTrack.title,
            artist: musicTrack.artist,
            category: musicTrack.category,
            mood: musicTrack.mood,
            src: musicTrack.src || null,
            volume: musicVolume / 100,
            trimStart: musicTrimStart,
            trimEnd: musicTrimEnd,
          }
        : null,
    };

    await onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <button onClick={onCancel} className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10">
            Cancel
          </button>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">Moment Editor</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className="rounded-full bg-gradient-to-r from-[#ff4d6d] to-[#7b2cbf] px-5 py-2 text-sm font-semibold"
          >
            Save
          </motion.button>
        </div>

        <div className="relative flex-1 overflow-hidden bg-black/70">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-[82vh] w-[min(94vw,420px)] overflow-hidden rounded-3xl border border-white/15 bg-zinc-900 shadow-2xl">
              {!isVideo && <canvas ref={previewCanvasRef} className="h-full w-full" />}

              {!isVideo && (
                <img
                  ref={imageRef}
                  src={previewUrl}
                  alt="source"
                  className="hidden"
                  onLoad={() => {
                    // trigger canvas render via state dependencies
                    setFilterKey((key) => key);
                  }}
                />
              )}

              {isVideo && (
                <video ref={videoRef} src={previewUrl} className="h-full w-full object-cover" controls style={visualStyle} />
              )}

              <canvas
                ref={drawingCanvasRef}
                width={420}
                height={760}
                className={`absolute inset-0 h-full w-full ${activeTool === 'draw' ? 'cursor-crosshair' : 'pointer-events-none'}`}
                onPointerDown={activeTool === 'draw' ? onDrawStart : undefined}
                onPointerMove={activeTool === 'draw' ? onDrawMove : undefined}
                onPointerUp={activeTool === 'draw' ? onDrawEnd : undefined}
                onPointerLeave={activeTool === 'draw' ? onDrawEnd : undefined}
              />

              {textOverlays.map((item) => (
                <DraggableLayerItem key={item.id} item={item} onMove={updateTextPosition} onRemove={removeText}>
                  <span style={{ color: item.color, fontSize: `${item.size}px` }} className="font-bold drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                    {item.text}
                  </span>
                </DraggableLayerItem>
              ))}

              {stickers.map((item) => (
                <DraggableLayerItem key={item.id} item={item} onMove={updateStickerPosition} onRemove={removeSticker}>
                  <span className="text-4xl">{item.emoji}</span>
                </DraggableLayerItem>
              ))}

              {musicTrack && (
                <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs font-medium backdrop-blur">
                  🎵 {musicTrack.title}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-black/90 p-3">
          <div className="mb-3 flex gap-2 overflow-x-auto">
            {[
              ['filters', 'Filters'],
              ['music', 'Music'],
              ['text', 'Text'],
              ['stickers', 'Stickers'],
              ['draw', 'Draw'],
              ['media', 'Media'],
              ['privacy', 'Privacy'],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTool(id)}
                className={`rounded-full px-3 py-1.5 text-xs ${activeTool === id ? 'bg-[#7b2cbf] text-white' : 'bg-white/10 text-white/80'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTool === 'filters' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex flex-wrap gap-2">
                {Object.keys(PRESET_FILTERS).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterKey(f)}
                    className={`rounded-full px-3 py-1 text-xs ${filterKey === f ? 'bg-[#ff4d6d] text-white' : 'bg-white/10 text-white/80'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="grid gap-1 text-xs text-white/80">
                <label>Brightness <input type="range" min="60" max="140" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full" /></label>
                <label>Contrast <input type="range" min="60" max="140" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full" /></label>
                <label>Saturation <input type="range" min="0" max="160" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="w-full" /></label>
              </div>
            </div>
          )}

          {activeTool === 'media' && (
            <div className="grid gap-1 text-xs text-white/80 sm:grid-cols-3">
              <label>Rotate <input type="range" min="-180" max="180" value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="w-full" /></label>
              <label>Resize <input type="range" min="0.7" max="1.5" step="0.01" value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full" /></label>
              <label>
                Crop
                <select value={cropRatio} onChange={(e) => setCropRatio(e.target.value)} className="w-full rounded bg-white/10 p-1">
                  <option value="9:16">9:16</option>
                  <option value="4:5">4:5</option>
                  <option value="1:1">1:1</option>
                </select>
              </label>
            </div>
          )}

          {activeTool === 'draw' && (
            <div className="flex items-center gap-3 text-xs text-white/85">
              <label className="flex items-center gap-2">Color <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} /></label>
              <button onClick={clearDrawing} className="rounded bg-white/10 px-3 py-1 hover:bg-white/15">Clear Drawing</button>
            </div>
          )}

          {activeTool === 'text' && (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Add text overlay"
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm outline-none"
              />
              <button onClick={addText} className="rounded-xl bg-[#ff4d6d] px-4 py-2 text-sm font-semibold">Add</button>
              <div className="flex items-center gap-3 text-xs text-white/85 sm:col-span-2">
                <label className="flex items-center gap-2">Color <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} /></label>
                <label>Size <input type="range" min="14" max="64" value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} /></label>
              </div>
            </div>
          )}

          {activeTool === 'stickers' && (
            <div className="flex flex-wrap gap-2">
              {DEFAULT_STICKERS.map((sticker) => (
                <button key={sticker} onClick={() => addSticker(sticker)} className="rounded-xl bg-white/10 px-3 py-2 text-2xl hover:bg-white/15">
                  {sticker}
                </button>
              ))}
            </div>
          )}

          {activeTool === 'music' && (
            <div className="space-y-2 text-xs text-white/85">
              {musicTrack && (
                <div className="rounded-xl border border-white/15 bg-white/5 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-white/60">Now selected</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-medium text-white">
                      {musicTrack.category === 'bgm' ? '🎼' : '🎵'} {musicTrack.title}
                    </span>
                    <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] uppercase">
                      {musicTrack.category || 'song'}
                    </span>
                  </div>
                  <p className="text-white/60">{musicTrack.artist}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={togglePreview}
                      className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold hover:bg-black/60"
                    >
                      {isPreviewPlaying ? 'Pause Preview' : 'Play 10s Preview'}
                    </button>
                    <span className="text-[11px] text-white/60">
                      {isPreviewPlaying ? `${previewSecondsLeft}s left` : '10s sample'}
                    </span>
                    <button
                      onClick={resetMusicSelection}
                      className="rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[11px] font-semibold hover:bg-black/50"
                    >
                      Reset Music
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {[
                  ['all', 'All'],
                  ['song', 'Songs'],
                  ['bgm', 'BGMs'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setMusicCategory(value)}
                    className={`rounded-full px-3 py-1.5 ${musicCategory === value ? 'bg-[#ff4d6d] text-white' : 'bg-white/10 text-white/80'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {[
                  ['all', 'Any Mood'],
                  ['romantic', 'Romantic'],
                  ['chill', 'Chill'],
                  ['hype', 'Hype'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setMusicMoodPreset(value)}
                    className={`rounded-full px-3 py-1.5 ${musicMoodPreset === value ? 'bg-[#7b2cbf] text-white' : 'bg-white/10 text-white/80'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                value={musicSearchQuery}
                onChange={(e) => setMusicSearchQuery(e.target.value)}
                placeholder="Search songs or BGMs"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/60"
              />
              <div className="flex items-center gap-2">
                <label className="rounded bg-white/10 px-3 py-1.5 hover:bg-white/15">
                  Upload {musicCategory === 'bgm' ? 'BGM' : 'Song'}
                  <input type="file" accept="audio/*" className="hidden" onChange={onMusicUpload} />
                </label>
                <span className="text-white/60">or select from library</span>
              </div>
              <div className="max-h-24 space-y-1 overflow-y-auto rounded-xl border border-white/10 p-2">
                {(musicCategory === 'all' ? groupedMusicList.songs : []).length > 0 && (
                  <p className="px-1 py-0.5 text-[10px] uppercase tracking-wide text-white/55">Songs</p>
                )}
                {(musicCategory === 'all' ? groupedMusicList.songs : filteredMusicList).map((track) => (
                  <button
                    key={track.id}
                    onClick={() => setMusicTrack(track)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1 text-left ${musicTrack?.id === track.id ? 'bg-[#7b2cbf]' : 'bg-white/5'}`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{track.category === 'bgm' ? '🎼' : '🎵'}</span>
                      <span>{track.title} - {track.artist}</span>
                    </span>
                    <span>{track.duration}s</span>
                  </button>
                ))}

                {musicCategory === 'all' && groupedMusicList.bgms.length > 0 && (
                  <p className="mt-1 px-1 py-0.5 text-[10px] uppercase tracking-wide text-white/55">BGMs</p>
                )}
                {musicCategory === 'all' && groupedMusicList.bgms.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => setMusicTrack(track)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1 text-left ${musicTrack?.id === track.id ? 'bg-[#7b2cbf]' : 'bg-white/5'}`}
                  >
                    <span className="flex items-center gap-2">
                      <span>🎼</span>
                      <span>{track.title} - {track.artist}</span>
                    </span>
                    <span>{track.duration}s</span>
                  </button>
                ))}

                {musicCategory === 'all' && groupedMusicList.other.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => setMusicTrack(track)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1 text-left ${musicTrack?.id === track.id ? 'bg-[#7b2cbf]' : 'bg-white/5'}`}
                  >
                    <span className="flex items-center gap-2">
                      <span>🎧</span>
                      <span>{track.title} - {track.artist}</span>
                    </span>
                    <span>{track.duration}s</span>
                  </button>
                ))}

                {!filteredMusicList.length && (
                  <p className="rounded bg-white/5 px-2 py-1 text-white/60">No tracks in this category yet.</p>
                )}
              </div>
              {musicTrack && (
                <div className="grid gap-1 sm:grid-cols-3">
                  <label>Trim Start <input type="range" min="0" max="25" value={musicTrimStart} onChange={(e) => setMusicTrimStart(Number(e.target.value))} className="w-full" /></label>
                  <label>Trim End <input type="range" min="5" max="30" value={musicTrimEnd} onChange={(e) => setMusicTrimEnd(Number(e.target.value))} className="w-full" /></label>
                  <label>Volume <input type="range" min="0" max="100" value={musicVolume} onChange={(e) => setMusicVolume(Number(e.target.value))} className="w-full" /></label>
                </div>
              )}
            </div>
          )}

          {activeTool === 'privacy' && (
            <div className="space-y-2 text-xs text-white/85">
              <div className="flex gap-2">
                {[
                  ['public', 'Public'],
                  ['friends', 'Friends only'],
                  ['specific', 'Specific users'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setPrivacy(value)}
                    className={`rounded-full px-3 py-1.5 ${privacy === value ? 'bg-[#ff4d6d]' : 'bg-white/10'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {privacy === 'specific' && (
                <input
                  value={specificUsers}
                  onChange={(e) => setSpecificUsers(e.target.value)}
                  placeholder="Comma-separated user IDs"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm outline-none"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
