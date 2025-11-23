import { useState } from "react";

export default function Button({ label, hoverColor = "#2f4a34" }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      className="px-8 py-3 rounded-full text-[15px] tracking-wide border transition-all duration-300"
      style={{
        backgroundColor: hovered ? hoverColor : "transparent",
        borderColor: hoverColor,
        color: hovered ? "white" : hoverColor,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
}
