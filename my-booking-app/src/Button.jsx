import { useState } from "react";
import "./Button.css";

export default function Button({
  label,
  hoverColor = "#2f4a34",
  baseColor,
  className = "",
  onClick = () => {},
}) {
  const [hovered, setHovered] = useState(false);

  const buttonClasses = ["button", hovered ? "button--hovered" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={buttonClasses}
      style={{
        "--button-base": baseColor || hoverColor,
        "--button-hover": hoverColor,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
