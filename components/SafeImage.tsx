'use client';
import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';

type SafeImageProps = Omit<ImageProps, 'src'> & {
  src?: string | null;
  fallbackText?: string;
  fallbackSrc?: string;
  wrapperClassName?: string;
};

export function SafeImage({ src, fallbackText = 'Animesu', fallbackSrc = '/placeholder-poster.svg', alt, wrapperClassName, ...props }: SafeImageProps) {
  const [failed, setFailed] = useState(!src);
  const finalSrc = failed ? fallbackSrc : String(src);
  const optimizedProps = {
    loading: props.priority ? undefined : (props.loading || 'lazy'),
    quality: props.quality || 72,
    sizes: props.sizes || (props.fill ? '(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw' : undefined),
    ...props
  } as ImageProps;
  return <>
    <Image {...optimizedProps} src={finalSrc} alt={alt || fallbackText} onError={() => setFailed(true)} className={`${props.className || ''} ${failed ? 'safe-image-fallback' : ''}`}/>
    {failed && props.fill ? <span className="safe-image-label">{fallbackText}</span> : null}
  </>;
}
