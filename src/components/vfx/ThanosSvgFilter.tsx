'use client';

/**
 * ThanosSvgFilter
 * Filtro SVG invisible global acelerado por GPU para erosión y fragmentación tipo polvo.
 * Se aplica mediante CSS `filter: url(#thanos-disintegrate)` durante las transiciones.
 */
export default function ThanosSvgFilter() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <defs>
        {/* Filtro Estándar: Disolución en ceniza rápida (0.38s) */}
        <filter
          id="thanos-disintegrate"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.08"
            numOctaves="3"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="28"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Filtro Épico: Mayor escala de fragmentación para remates y compras confirmadas (0.75s) */}
        <filter
          id="thanos-disintegrate-epic"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.06"
            numOctaves="4"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="45"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Filtro Cinematográfico Aura: Fragmentación orgánica tipo arena/ceniza */}
        <filter id="aura-cinema-erosion" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.065"
            numOctaves="3"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="24"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

