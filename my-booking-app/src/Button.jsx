import { useState } from "react";
import "./Button.css";

export default function Button({
  label,
  hoverColor = "#2f4a34",
  baseColor,
  className = "",
  onClick = () => {},
}) {
  // Simple hover flag so we can toggle CSS classes without external state.
  const [hovered, setHovered] = useState(false); // track hover for CSS transitions

  const buttonClasses = ["button", hovered ? "button--hovered" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={buttonClasses}
      style={{
        "--button-base": baseColor || hoverColor, // let callers override palette
        "--button-hover": hoverColor,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Keeping only label here so this stays a dumb reusable button. */}
      {label}
    </button>
  );
}
