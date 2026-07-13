import React, { useCallback, useReducer, useRef } from "react";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const initialCropState = {
  imgDisplay: { w: 0, h: 0 },
  imgNatural: { w: 0, h: 0 },
  crop: { x: 0, y: 0, w: 220, h: 220 },
};

function cropReducer(state, action) {
  switch (action.type) {
    case "INIT_IMAGE":
      return {
        ...state,
        imgNatural: action.payload.imgNatural,
        imgDisplay: action.payload.imgDisplay,
        crop: action.payload.crop,
      };
    case "SET_CROP":
      return { ...state, crop: action.payload };
    default:
      return state;
  }
}

export default function CropModal({ src, onConfirm, onCancel, theme, cropTarget = "avatar" }) {
  const [state, dispatch] = useReducer(cropReducer, initialCropState);
  const dragRef = useRef(null);

  const { imgDisplay, imgNatural, crop } = state;

  const onImgLoad = (e) => {
    const img = e.currentTarget;
    const MAX_W = Math.min(window.innerWidth - 48, 440);
    const MAX_H = Math.min(Math.floor(window.innerHeight * 0.52), 360);
    const scale = Math.min(MAX_W / img.naturalWidth, MAX_H / img.naturalHeight, 1);
    const dw = Math.round(img.naturalWidth * scale);
    const dh = Math.round(img.naturalHeight * scale);
    const initH = Math.max(80, Math.round(dh * 0.84));
    const initW = Math.max(56, Math.round(dw * 0.9));

    dispatch({
      type: "INIT_IMAGE",
      payload: {
        imgNatural: { w: img.naturalWidth, h: img.naturalHeight },
        imgDisplay: { w: dw, h: dh },
        crop: { x: Math.round((dw - initW) / 2), y: Math.round((dh - initH) / 2), w: initW, h: initH },
      },
    });
  };

  const handlePointerDown = (e, mode) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { mode, px: e.clientX, py: e.clientY, snap: { ...crop } };
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    const { mode, px, py, snap } = dragRef.current;
    const dx = e.clientX - px;
    const dy = e.clientY - py;

    if (mode === "move") {
      dispatch({
        type: "SET_CROP",
        payload: {
          x: clamp(snap.x + dx, 0, imgDisplay.w - snap.w),
          y: clamp(snap.y + dy, 0, imgDisplay.h - snap.h),
          w: snap.w,
          h: snap.h,
        },
      });
      return;
    }

    if (mode === "resize") {
      const nextW = clamp(snap.w + dx, 40, imgDisplay.w - snap.x);
      const nextH = clamp(snap.h + dy, 40, imgDisplay.h - snap.y);
      dispatch({ type: "SET_CROP", payload: { ...crop, w: nextW, h: nextH } });
    }
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const confirmCrop = () => {
    if (!imgDisplay.w) return;
    const scX = imgNatural.w / imgDisplay.w;
    const scY = imgNatural.h / imgDisplay.h;
    const sx = Math.round(crop.x * scX);
    const sy = Math.round(crop.y * scY);
    const sw = Math.round(crop.w * scX);
    const sh = Math.round(crop.h * scY);

    const cvs = document.createElement("canvas");
    cvs.width = sw;
    cvs.height = sh;
    const ctx = cvs.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      onConfirm(cvs.toDataURL("image/png"));
    };
    img.src = src;
  };

  const title =
    cropTarget === "background"
      ? "Crop Background"
      : cropTarget === "overlay"
      ? "Crop Overlay"
      : "Crop Avatar";

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 20000, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--ui-space-4)", animation: "modalBackdropFade 220ms var(--ease-ios)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: theme?.cardBg || "#1c1c1e", borderRadius: "var(--ui-radius-lg)", padding: "var(--ui-space-3)", width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: "var(--ui-space-2)", boxShadow: theme?.cardShadow || "0 24px 64px rgba(0,0,0,0.6)", border: `1px solid ${theme?.cardBorder || "rgba(255,255,255,0.14)"}`, animation: "modalContentSpring 380ms var(--ease-spring)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: theme?.textPrimary || "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button onClick={onCancel} aria-label="Close" style={{ background: "rgba(255,255,255,0.1)", border: "none", color: theme?.textPrimary || "#fff", borderRadius: "50%", width: 32, height: 32, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        <div
          style={{ position: "relative", display: "flex", justifyContent: "center", background: "linear-gradient(160deg, rgba(5,8,18,0.95), rgba(12,16,28,0.9))", borderRadius: "var(--ui-radius-md)", overflow: "hidden", userSelect: "none", touchAction: "none", minHeight: 80 }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div style={{ position: "relative", width: imgDisplay.w || "auto", height: imgDisplay.h || "auto", maxWidth: "100%" }}>
            <img src={src} onLoad={onImgLoad} draggable={false} style={{ display: "block", width: imgDisplay.w || "auto", height: imgDisplay.h || "auto", maxWidth: "100%", pointerEvents: "none" }} />
            {imgDisplay.w > 0 && (
              <>
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: crop.y, background: "rgba(0,0,0,0.65)" }} />
                  <div style={{ position: "absolute", top: crop.y + crop.h, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.65)" }} />
                  <div style={{ position: "absolute", top: crop.y, left: 0, width: crop.x, height: crop.h, background: "rgba(0,0,0,0.65)" }} />
                  <div style={{ position: "absolute", top: crop.y, left: crop.x + crop.w, right: 0, height: crop.h, background: "rgba(0,0,0,0.65)" }} />
                </div>
                <div onPointerDown={(e) => handlePointerDown(e, "move")} style={{ position: "absolute", left: crop.x, top: crop.y, width: crop.w, height: crop.h, border: `2.5px solid ${theme?.accent || "#0a84ff"}`, borderRadius: 8, cursor: "move", touchAction: "none", boxSizing: "border-box" }}>
                  <div onPointerDown={(e) => handlePointerDown(e, "resize")} style={{ position: "absolute", bottom: -10, right: -10, width: 22, height: 22, background: theme?.accent || "#0a84ff", borderRadius: "50%", cursor: "nwse-resize", border: "2px solid #fff" }} />
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "var(--ui-space-1)" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "var(--ui-radius-md)", color: theme?.textPrimary || "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={confirmCrop} style={{ flex: 2, padding: "10px 14px", background: `linear-gradient(135deg, ${theme?.accent || "#0a84ff"}, ${theme?.accent2 || "#2dd4bf"})`, border: "none", borderRadius: "var(--ui-radius-md)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>✓ Apply Crop</button>
        </div>

      </div>
    </div>
  );
}
