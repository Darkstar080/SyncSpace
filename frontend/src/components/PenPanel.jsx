import { useEffect, useRef } from "react"
const COLORS = [
  "#1e1e1e",
  "#e03131",
  "#1971c2",
  "#2f9e44",
  "#f08c00",
  "#ae3ec9",
]
const STROKE_WIDTHS = [2, 4, 8]


export default function PenPanel({
  penColor,
  setPenColor,
  strokeWidth,
  setStrokeWidth,
  opacity,
  setOpacity,
  penType,
  setPenType,
   position,
  setPosition,
}) {
  return (
            <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
                position: "absolute",
                top: position.y,
                left: position.x,
                width: 320,
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 1000,
            }}
            >
        <div
            style={{
                marginTop: "20px",
                marginBottom: "10px",
                fontSize: "15px",
                fontWeight: "600",
            }}
            >
            Stroke Width
         </div>
         <div
            style={{
                display: "flex",
                gap: "12px",
                marginBottom: "20px"
            }}
            >
        {STROKE_WIDTHS.map((width) => (
        <button
            key={width}
            onClick={() => setStrokeWidth(width)}
            style={{
            width: 42,
            height: 42,
            border: strokeWidth === width ? "2px solid #2563eb" : "1px solid #ddd",
            borderRadius: "10px",
            background: strokeWidth === width ? "#eef4ff" : "#fff",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            }}
        >
            <div
                style={{
                    width: 24,
                    height: width,
                    background: "#222",
                    borderRadius: 999,
                }}
                />
        </button>
        ))}
</div>
         <div
            style={{
                fontSize: "15px",
                fontWeight: "600",
                marginBottom: "16px",
            }}
            >
            Stroke
         </div>
         
            <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
            }}
            >
            {COLORS.map((color) => (
                <div
                key={color}
                onClick={() => setPenColor(color)}
                style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: color,
                    cursor: "pointer",
                    border:
                    penColor === color
                        ? "2px solid #2563eb"
                        : "2px solid transparent",
                }}
                />
            ))}
            </div>
              <div
                style={{
                    marginTop: "20px",
                    marginBottom: "10px",
                    fontSize: "15px",
                    fontWeight: "600",
                }}
                >
                Opacity
            </div>
          <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                }}
                >
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    style={{
                    flex: 1,
                    accentColor: "#000",
                    cursor: "pointer",
                    }}
                />
                <span
                    style={{
                    width: "40px",
                    textAlign: "right",
                    fontSize: "14px",
                    fontWeight: "500",
                    }}
                >
                    {opacity}%
                </span>
         </div>
        <h4
        style={{
            fontSize: "14px",
            fontWeight: "600",
            marginTop: "14px",
            marginBottom: "8px",
        }}
        >
        Special Pen
        </h4>

    <button
    onClick={() => setPenType(penType === "laser" ? "normal" : "laser")}
    style={{
        width: "100%",
        padding: "10px",
        borderRadius: "8px",
        border: penType === "laser" ? "2px solid red" : "1px solid #ccc",
        background: penType === "laser" ? "#ffe5e5" : "#fff",
        cursor: "pointer",
        fontWeight: "600",
    }}
    >
    ✨ 🔦 Laser Pointer
    </button>
    </div>
  )
}