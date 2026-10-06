"use client";
import { useMemo } from "react";
import * as O from "@/lib/optics";
import { lutTexture } from "@/lib/scene/materials";
import NanoDive from "../three/NanoDive";

export default function DiveStep() {
  const lut = useMemo(() => lutTexture(O.angleLUT(O.morphoStack(), 96, 80).data), []);
  return <NanoDive lut={lut} />;
}
