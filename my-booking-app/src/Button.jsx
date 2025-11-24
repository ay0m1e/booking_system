import { useState } from "react";

export default function Button({
  label,
  hoverColor = "#2f4a34",
  className = "",
  onClick = () => {}
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      className={
        // Tailwind styles for sizing, font, spacing, shape
        "px-8 py-3 rounded-full text-[15px] font-light tracking-wide transition-all border " +
        className
      }
      style={{
        // only colour is dynamic
        borderColor: hoverColor,
        backgroundColor: hovered ? hoverColor : "transparent",
        color: hovered ? "white" : hoverColor,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
}
