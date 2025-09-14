type CardSize = 'mini' | 'large';

export function CssCard({ rank, size = 'large', covered = false }: { rank: number; size?: CardSize; covered?: boolean }) {
  const rankLabel = (n: number) => (n === 1 ? 'A' : n === 11 ? 'J' : n === 12 ? 'Q' : n === 13 ? 'K' : String(n));
  const cls = `css-card ${size}`;

  return (
    <div className={cls} data-rank={rankLabel(rank)} data-suit="heart">
      {covered ? (
        <div className="card-back-pattern">
        </div>
      ) : (
        <>
          <div className="corner tl"><div className="heart"></div></div>
          <div className="corner tr"><div className="heart"></div></div>
          <div className="corner bl"><div className="heart"></div></div>
          <div className="corner br"><div className="heart"></div></div>
          <div className="center">
            <div className="rank-center">{rankLabel(rank)}</div>
          </div>
        </>
      )}
    </div>
  );
}


