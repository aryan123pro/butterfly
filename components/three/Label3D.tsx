"use client";
import { Billboard, Text } from "@react-three/drei";

/* Text that lives in the 3D scene and always faces the camera. Uses a bundled font so it works offline. */
export default function Label3D({ position, children, color = "#c8d2de", size = 0.5, anchorX = "center" }: {
  position: [number, number, number]; children: string; color?: string; size?: number; anchorX?: "left" | "center" | "right";
}) {
  return (
    <Billboard position={position}>
      <Text
        font="/fonts/IBMPlexMono-Medium.ttf"
        fontSize={size}
        color={color}
        anchorX={anchorX}
        anchorY="middle"
        outlineWidth={size * 0.12}
        outlineColor="#05070b"
        outlineOpacity={0.9}
      >
        {children}
      </Text>
    </Billboard>
  );
}
