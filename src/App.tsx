import { useState, useRef, useEffect, useCallback } from 'react';
import { renderQR } from './qr-engine';
import type { QROptions, DotStyle, CornerSquareStyle, CornerDotStyle } from './qr-engine';
import './App.css';

/* ── TYPES ── */
type Tab = 'dots' | 'corners' | 'color' | 'image';

const DOT_STYLES: { value: DotStyle; label: string }[] = [
  { value: 'square',         label: 'Square' },
  { value: 'rounded',        label: 'Rounded' },
  { value: 'dots',           label: 'Dots' },
  { value: 'classy',         label: 'Classy' },
  { value: 'classy-rounded', label: 'Classy Rounded' },
  { value: 'blended',        label: 'Blended' },
];

const CORNER_SQ: { value: CornerSquareStyle; label: string }[] = [
  { value: 'square',        label: 'Square' },
  { value: 'extra-rounded', label: 'Rounded' },
  { value: 'dot',           label: 'Circle' },
];

const CORNER_DOT: { value: CornerDotStyle; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'dot',    label: 'Circle' },
];

const ECL_OPTS = [
  { value: 'L', label: 'L — 7%' },
  { value: 'M', label: 'M — 15%' },
  { value: 'Q', label: 'Q — 25%' },
  { value: 'H', label: 'H — 30%' },
] as const;

const TABS: { value: Tab; label: string }[] = [
  { value: 'dots',    label: '◾ Dots' },
  { value: 'corners', label: '⬜ Corners' },
  { value: 'color',   label: '🎨 Color' },
  { value: 'image',   label: '🖼 Image' },
];

/* ── CURSOR (desktop only) ── */
function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [big, setBig] = useState(false);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!mq.matches) return;
    setShow(true);
    const move = (e: MouseEvent) => {
      if (ref.current) {
        ref.current.style.left = e.clientX + 'px';
        ref.current.style.top  = e.clientY + 'px';
      }
    };
    const over = (e: MouseEvent) => {
      const t = e.target as Element;
      if (t.closest('a,button,label,input[type="color"],.qrs-style-btn')) setBig(true);
    };
    const out = () => setBig(false);
    window.addEventListener('mousemove', move);
    document.addEventListener('mouseover', over);
    document.addEventListener('mouseout', out);
    return () => {
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseover', over);
      document.removeEventListener('mouseout', out);
    };
  }, []);
  if (!show) return null;
  return <div ref={ref} className={`qrs-cursor${big ? ' big' : ''}`} aria-hidden />;
}

/* ── TOGGLE ── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button className={`qrs-toggle${on ? ' on' : ''}`} onClick={onToggle} aria-pressed={on}>
      <span className="qrs-toggle-thumb" />
    </button>
  );
}

/* ── COLOR TILE ── */
function ColorTile({
  label, value, onChange, transparent, onTransparent,
}: {
  label: string; value: string; onChange: (v: string) => void;
  transparent?: boolean; onTransparent?: () => void;
}) {
  return (
    <div className="qrs-color-tile">
      <label>{label}</label>
      <div className="qrs-color-row">
        <div className="qrs-color-swatch">
          <input type="color" value={value} onChange={e => onChange(e.target.value)} />
        </div>
        <span className="qrs-color-hex">{value}</span>
        {onTransparent && (
          <div
            className={`qrs-checker-swatch${transparent ? ' active' : ''}`}
            title="Transparent background"
            onClick={onTransparent}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onTransparent()}
          />
        )}
      </div>
    </div>
  );
}

/* ── MAIN APP ── */
export default function QRStudio() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState<Tab>('dots');
  const [fileName, setFileName] = useState<string | null>(null);
  const [centerImg, setCenterImg]   = useState<HTMLImageElement | null>(null);
  const [centerImgUrl, setCenterImgUrl] = useState<string | null>(null);
  const [useGradient, setUseGradient]   = useState(false);
  const [transparentBg, setTransparentBg] = useState(false);
  const [gradColor1, setGradColor1] = useState('#000000');
  const [gradColor2, setGradColor2] = useState('#444444');
  const [gradType, setGradType] = useState<'linear' | 'radial'>('radial');

  const [opts, setOpts] = useState<QROptions>({
    text:                 'https://example.com',
    size:                 512,
    dotStyle:             'classy-rounded',
    cornerSquareStyle:    'extra-rounded',
    cornerDotStyle:       'dot',
    fgColor:              '#000000',
    bgColor:              '#ffffff',
    centerImage:          null,
    centerImageSize:      22,
    errorCorrectionLevel: 'H',
    gradient:             null,
  });

  const patch = (p: Partial<QROptions>) => setOpts(o => ({ ...o, ...p }));

  /* render */
  const render = useCallback(async () => {
    if (!canvasRef.current) return;
    await renderQR(
      canvasRef.current,
      {
        ...opts,
        bgColor: transparentBg ? 'transparent' : opts.bgColor,
        gradient: useGradient
          ? { type: gradType, color1: gradColor1, color2: gradColor2 }
          : null,
      },
      centerImg,
    );
  }, [opts, centerImg, useGradient, gradColor1, gradColor2, gradType, transparentBg]);

  useEffect(() => { render(); }, [render]);

  /* image upload */
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setCenterImgUrl(url);
    const img = new Image();
    img.onload = () => { setCenterImg(img); patch({ centerImage: url }); };
    img.src = url;
  };

  const removeImg = () => {
    setCenterImg(null); setCenterImgUrl(null); setFileName(null);
    patch({ centerImage: null });
  };

  /* download */
  const download = (format: 'png' | 'svg') => {
    if (!canvasRef.current) return;
    if (format === 'png') {
      const link = document.createElement('a');
      link.download = 'qrcode.png';
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    } else {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const sz = opts.size;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}">
  <image href="${dataUrl}" width="${sz}" height="${sz}"/>
</svg>`;
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const link = document.createElement('a');
      link.download = 'qrcode.svg';
      link.href = URL.createObjectURL(blob);
      link.click();
    }
  };

  /* tab pane */
  const TabPane = () => {
    switch (tab) {
      case 'dots': return (
        <div className="qrs-tab-content" key="dots">
          <div className="qrs-group">
            <div className="qrs-section-label">Dot Style</div>
            <div className="qrs-style-grid">
              {DOT_STYLES.map(s => (
                <button
                  key={s.value}
                  className={`qrs-style-btn${opts.dotStyle === s.value ? ' active' : ''}`}
                  onClick={() => patch({ dotStyle: s.value })}
                >{s.label}</button>
              ))}
            </div>
          </div>
          <div className="qrs-group">
            <div className="qrs-section-label">Error Correction</div>
            <div className="qrs-style-grid">
              {ECL_OPTS.map(o => (
                <button
                  key={o.value}
                  className={`qrs-style-btn${opts.errorCorrectionLevel === o.value ? ' active' : ''}`}
                  onClick={() => patch({ errorCorrectionLevel: o.value })}
                >{o.label}</button>
              ))}
            </div>
            <span className="qrs-hint">Use <b>H</b> when embedding a center image — 30% recovery.</span>
          </div>
          <div className="qrs-group">
            <div className="qrs-section-label">Output Size</div>
            <div className="qrs-style-grid">
              {([256, 512, 768, 1024] as const).map(s => (
                <button
                  key={s}
                  className={`qrs-style-btn${opts.size === s ? ' active' : ''}`}
                  onClick={() => patch({ size: s })}
                >{s}px</button>
              ))}
            </div>
          </div>
        </div>
      );

      case 'corners': return (
        <div className="qrs-tab-content" key="corners">
          <div className="qrs-group">
            <div className="qrs-section-label">Outer Ring</div>
            <div className="qrs-style-grid">
              {CORNER_SQ.map(s => (
                <button
                  key={s.value}
                  className={`qrs-style-btn${opts.cornerSquareStyle === s.value ? ' active' : ''}`}
                  onClick={() => patch({ cornerSquareStyle: s.value })}
                >{s.label}</button>
              ))}
            </div>
          </div>
          <div className="qrs-group">
            <div className="qrs-section-label">Inner Block</div>
            <div className="qrs-style-grid">
              {CORNER_DOT.map(s => (
                <button
                  key={s.value}
                  className={`qrs-style-btn${opts.cornerDotStyle === s.value ? ' active' : ''}`}
                  onClick={() => patch({ cornerDotStyle: s.value })}
                >{s.label}</button>
              ))}
            </div>
          </div>
        </div>
      );

      case 'color': return (
        <div className="qrs-tab-content" key="color">
          <div className="qrs-group">
            <div className="qrs-section-label">Colors</div>
            <div className="qrs-color-pair">
              <ColorTile label="Foreground" value={opts.fgColor} onChange={v => patch({ fgColor: v })} />
              <ColorTile
                label="Background"
                value={opts.bgColor}
                onChange={v => { setTransparentBg(false); patch({ bgColor: v }); }}
                transparent={transparentBg}
                onTransparent={() => setTransparentBg(t => !t)}
              />
            </div>
            {transparentBg && (
              <span className="qrs-hint">Transparent background — download as PNG to preserve transparency.</span>
            )}
          </div>

          <div className="qrs-group">
            <div className="qrs-section-label">Gradient</div>
            <div className="qrs-toggle-row">
              <span className="qrs-toggle-label">Enable gradient fill</span>
              <Toggle on={useGradient} onToggle={() => setUseGradient(v => !v)} />
            </div>
            {useGradient && (
              <div className="qrs-gradient-box">
                <div className="qrs-color-pair">
                  <ColorTile label="Start" value={gradColor1} onChange={setGradColor1} />
                  <ColorTile label="End"   value={gradColor2} onChange={setGradColor2} />
                </div>
                <div className="qrs-style-grid">
                  <button className={`qrs-style-btn${gradType === 'linear' ? ' active' : ''}`} onClick={() => setGradType('linear')}>Linear</button>
                  <button className={`qrs-style-btn${gradType === 'radial' ? ' active' : ''}`} onClick={() => setGradType('radial')}>Radial</button>
                </div>
                <span className="qrs-hint">Gradient overrides foreground color. Corners use start color.</span>
              </div>
            )}
          </div>
        </div>
      );

      case 'image': return (
        <div className="qrs-tab-content" key="image">
          <div className="qrs-group">
            <div className="qrs-section-label">Center Image</div>
            {centerImgUrl ? (
              <div className="qrs-img-row">
                <img src={centerImgUrl} alt="" className="qrs-img-thumb" />
                <span className="qrs-img-name">{fileName}</span>
                <button className="qrs-remove-btn" onClick={removeImg}>✕ Remove</button>
              </div>
            ) : (
              <label className="qrs-upload-zone">
                <input type="file" accept="image/*" onChange={handleUpload} />
                <span className="qrs-upload-icon">⬆</span>
                <span>Drop image or click to upload</span>
                <span className="qrs-hint">PNG · JPG · SVG · WebP</span>
              </label>
            )}
          </div>

          {centerImgUrl && (
            <div className="qrs-group">
              <div className="qrs-section-label">
                Image Size&nbsp;
                <span className="qrs-slider-val">{opts.centerImageSize}%</span>
              </div>
              <input
                type="range" min={10} max={40} step={1}
                value={opts.centerImageSize}
                onChange={e => patch({ centerImageSize: +e.target.value })}
                className="qrs-slider"
              />
              <span className="qrs-hint">Keep under <b>30%</b>. Set error correction to <b>H</b> for reliability.</span>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <>
      <Cursor />
      <div className="qrs-app">

        {/* NAV */}
        <nav className="qrs-nav">
          <a href="/" className="qrs-logo">
            <div className="qrs-logo-box">
              <img src="/logo.png" alt="QRStudio logo" className="qrs-logo-img" />
            </div>
            <b>QR</b><span>Studio</span>
          </a>
          <span className="qrs-nav-badge">by NoNonsenseDev</span>
        </nav>

        {/* MAIN */}
        <div className="qrs-main">

          {/* LEFT — PREVIEW */}
          <div className="qrs-preview">
            <div className="qrs-canvas-outer">
              <canvas ref={canvasRef} />
            </div>
            <div className="qrs-preview-actions">
              <button className="btn-dl btn-dl-png" onClick={() => download('png')}>↓ PNG</button>
              <button className="btn-dl btn-dl-svg" onClick={() => download('svg')}>↓ SVG</button>
            </div>
          </div>

          {/* RIGHT — CONTROLS */}
          <div className="qrs-controls">

            {/* URL */}
            <div className="qrs-url-row">
              <div className="qrs-section-label">Content / URL</div>
              <input
                className="qrs-text-input"
                type="text"
                value={opts.text}
                onChange={e => patch({ text: e.target.value })}
                placeholder="https://example.com"
                spellCheck={false}
              />
            </div>

            {/* DESKTOP TABS */}
            <div className="qrs-tabs">
              {TABS.map(t => (
                <button
                  key={t.value}
                  className={`qrs-tab${tab === t.value ? ' active' : ''}`}
                  onClick={() => setTab(t.value)}
                >{t.label}</button>
              ))}
            </div>

            {/* TAB CONTENT */}
            <TabPane />
          </div>
        </div>

        {/* MOBILE BOTTOM TABS */}
        <div className="qrs-mobile-tabs">
          {TABS.map(t => (
            <button
              key={t.value}
              className={`qrs-tab${tab === t.value ? ' active' : ''}`}
              onClick={() => setTab(t.value)}
              style={{ flex: '0 0 auto' }}
            >{t.label}</button>
          ))}
        </div>

        {/* FOOTER */}
        <footer className="qrs-footer">
          <span>
            <span className="qrs-status-dot" />
            QRStudio — client-side, zero uploads
          </span>
          <span>
            by <a href="/" target="_blank" rel="noopener">NoNonsenseDev</a>
          </span>
        </footer>
      </div>
    </>
  );
}