import React, { useEffect, useMemo, useReducer, useRef } from "react";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const getAspect = (target) => (target === "avatar" ? 1 : target === "background" ? 16 / 9 : null);
const createCrop = ({ w, h, aspect }) => {
  const margin = 18;
  let cw = Math.max(96, w - margin * 2);
  let ch = Math.max(96, h - margin * 2);
  if (aspect) {
    if (cw / ch > aspect) cw = ch * aspect;
    else ch = cw / aspect;
  }
  return { x: Math.round((w - cw) / 2), y: Math.round((h - ch) / 2), w: Math.round(cw), h: Math.round(ch) };
};

const initialState = { imgDisplay: { w: 0, h: 0 }, imgNatural: { w: 0, h: 0 }, crop: { x: 0, y: 0, w: 0, h: 0 } };
function reducer(state, action) {
  if (action.type === "INIT") return { ...state, ...action.payload };
  if (action.type === "SET_CROP") return { ...state, crop: action.payload };
  return state;
}

export default function CropModal({ src, onConfirm, onCancel, theme, cropTarget = "avatar" }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const dragRef = useRef(null);
  const aspect = useMemo(() => getAspect(cropTarget), [cropTarget]);
  const { imgDisplay, imgNatural, crop } = state;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const onImgLoad = (e) => {
    const img = e.currentTarget;
    const maxW = Math.min(window.innerWidth - 56, 980);
    const maxH = Math.min(window.innerHeight * 0.72, 640);
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    const display = { w: Math.round(img.naturalWidth * scale), h: Math.round(img.naturalHeight * scale) };
    dispatch({ type: "INIT", payload: { imgNatural: { w: img.naturalWidth, h: img.naturalHeight }, imgDisplay: display, crop: createCrop({ ...display, aspect }) } });
  };

  const startDrag = (e, mode) => { e.currentTarget.setPointerCapture(e.pointerId); dragRef.current = { mode, px: e.clientX, py: e.clientY, snap: { ...crop } }; };
  const stopDrag = () => { dragRef.current = null; };
  const onDrag = (e) => {
    if (!dragRef.current || !imgDisplay.w) return;
    const { mode, px, py, snap } = dragRef.current;
    const dx = e.clientX - px;
    const dy = e.clientY - py;
    if (mode === "move") {
      dispatch({ type: "SET_CROP", payload: { ...snap, x: clamp(snap.x + dx, 0, imgDisplay.w - snap.w), y: clamp(snap.y + dy, 0, imgDisplay.h - snap.h) } });
      return;
    }
    let nw = clamp(snap.w + dx, 72, imgDisplay.w - snap.x);
    let nh = clamp(snap.h + dy, 72, imgDisplay.h - snap.y);
    if (aspect) {
      if (Math.abs(dx) > Math.abs(dy)) nh = nw / aspect;
      else nw = nh * aspect;
      nw = clamp(nw, 72, imgDisplay.w - snap.x);
      nh = clamp(nh, 72, imgDisplay.h - snap.y);
    }
    dispatch({ type: "SET_CROP", payload: { ...snap, w: Math.round(nw), h: Math.round(nh) } });
  };

  const confirm = () => {
    if (!imgDisplay.w) return;
    const scX = imgNatural.w / imgDisplay.w;
    const scY = imgNatural.h / imgDisplay.h;
    const [sx, sy, sw, sh] = [Math.round(crop.x * scX), Math.round(crop.y * scY), Math.round(crop.w * scX), Math.round(crop.h * scY)];
    const cvs = document.createElement("canvas");
    cvs.width = sw; cvs.height = sh;
    const img = new Image();
    img.onload = () => { cvs.getContext("2d")?.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh); onConfirm(cvs.toDataURL("image/png", 0.96)); };
    img.src = src;
  };

  const top = crop.y; const left = crop.x; const right = imgDisplay.w - (crop.x + crop.w); const bottom = imgDisplay.h - (crop.y + crop.h);
  return <div onClick={(e) => e.target === e.currentTarget && onCancel()} style={{ position: "fixed", inset: 0, zIndex: 20000, display: "grid", placeItems: "center", padding: 20, background: "color-mix(in srgb, var(--theme-bg) 18%, #000)", backdropFilter: "blur(6px)" }}>
    <div style={{ width: "min(1040px,96vw)", borderRadius: 22, border: "1px solid var(--theme-border)", background: "var(--theme-surface)", boxShadow: "0 28px 60px rgba(0,0,0,.35)", padding: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3 style={{ margin: 0, fontSize: 18 }}>Crop image</h3><button className="fpill" onClick={onCancel}>Close</button></div>
      <div onPointerMove={onDrag} onPointerUp={stopDrag} onPointerLeave={stopDrag} style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid var(--theme-border)", display: "grid", placeItems: "center", background: "#080d18" }}>
        <div style={{ position: "relative", width: imgDisplay.w || "auto", height: imgDisplay.h || "auto" }}>
          <img src={src} onLoad={onImgLoad} draggable={false} style={{ display: "block", width: imgDisplay.w || "auto", height: imgDisplay.h || "auto", maxWidth: "100%", userSelect: "none" }} />
          {imgDisplay.w > 0 && <>
            <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: top, background: "rgba(1,6,14,.55)" }} />
            <div style={{ position: "absolute", left: 0, top: top, width: left, height: crop.h, background: "rgba(1,6,14,.55)" }} />
            <div style={{ position: "absolute", right: 0, top: top, width: right, height: crop.h, background: "rgba(1,6,14,.55)" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: bottom, background: "rgba(1,6,14,.55)" }} />
            <div onPointerDown={(e) => startDrag(e, "move")} style={{ position: "absolute", left: crop.x, top: crop.y, width: crop.w, height: crop.h, border: `2px solid ${theme?.accent || "var(--theme-accent)"}`, borderRadius: 12, cursor: "move" }}>
              <button onPointerDown={(e) => startDrag(e, "resize")} style={{ position: "absolute", right: -8, bottom: -8, width: 20, height: 20, borderRadius: 999, border: "2px solid #fff", background: theme?.accent || "var(--theme-accent)", cursor: "nwse-resize" }} />
            </div>
          </>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button className="fpill" onClick={onCancel}>Cancel</button><button className="fpill" onClick={confirm}>Apply Crop</button></div>
    </div>
  </div>;
}
