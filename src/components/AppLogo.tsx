/**
 * Logo compartido de EduPath.
 * Centraliza la importación del PNG para evitar que 15+ componentes
 * lo importen individualmente. Vite deduplica automáticamente el asset.
 *
 * Props:
 *  - priority: true  → fetchpriority="high" + decoding="sync"  (elemento LCP, login/home)
 *  - priority: false → loading="lazy" + decoding="async"        (navegación interna, no bloquea)
 */

const logoSrc = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;

interface AppLogoProps {
  /** Tamaño en px del lado del cuadrado. Default: 48 */
  size?: number;
  alt?: string;
  className?: string;
  /** true en el logo visible al cargar la página (LCP). false en pantallas internas. */
  priority?: boolean;
}

export function AppLogo({ size = 48, alt = 'EduPath', className = 'w-full h-full object-contain', priority = false }: AppLogoProps) {
  // fetchpriority es atributo HTML nativo (minúsculas) — React 18 no lo mapea en camelCase.
  // Se pasa como prop extra para evitar el warning "React does not recognize fetchPriority".
  const extraProps = { fetchpriority: priority ? 'high' : 'low' } as React.ImgHTMLAttributes<HTMLImageElement>;

  return (
    <img
      src={logoSrc}
      alt={alt}
      width={size}
      height={size}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      {...extraProps}
    />
  );
}
