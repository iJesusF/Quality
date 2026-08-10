import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VORTECH Quality",
    short_name: "VQ Quality",
    description: "Control de calidad y trazabilidad industrial.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f8",
    theme_color: "#1261a6",
    orientation: "any",
    icons: [
      { src: "/vortech-quality.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/vortech-quality.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
