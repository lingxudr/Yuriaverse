export function NewsSkeleton({ count = 6 }: { count?: number }) {
  return <div className="news-grid">{Array.from({ length: count }).map((_, i) => <article className="news-skeleton" key={i}><i/><b/><b className="short"/><p/><p/><span/></article>)}</div>;
}
