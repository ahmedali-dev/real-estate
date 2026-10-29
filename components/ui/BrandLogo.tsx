import Image from "next/image";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <span className={`estate-logo ${compact ? "estate-logo-compact" : ""}`}>
    <Image src="/brand/logo.png" alt="41 Real Estate — 41 للعقارات" width={529} height={472} sizes={compact ? "160px" : "300px"} priority className="estate-logo-image" />
  </span>;
}
