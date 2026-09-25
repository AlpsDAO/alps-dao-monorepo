import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { BigNumber } from 'ethers';
import { useHistory } from 'react-router-dom';
import { Trans } from '@lingui/macro';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { setOnDisplayAuctionAlpId } from '../../state/slices/onDisplayAuction';
import { alpPath } from '../../utils/history';
import { useAlpSeed } from '../../wrappers/alpToken';
import { getAlp } from '../StandaloneAlp';
import classes from './AlpBrowser.module.css';

// Builds an Alp's image only once its tile scrolls near the view, so opening the browser stays quick
const useNearView = <T extends Element>() => {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const observer = new IntersectionObserver(
      entries => entries.some(e => e.isIntersecting) && setNear(true),
      { rootMargin: '300px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);
  return [ref, near] as const;
};

const TileArt: React.FC<{ id: number }> = ({ id }) => {
  const seed = useAlpSeed(BigNumber.from(id));
  const alp = seed && getAlp(String(id), seed);
  return alp ? <img src={alp.image} alt={`Alp ${id}`} draggable={false} /> : null;
};

const Tile: React.FC<{ id: number; current: boolean; latest: boolean; onSelect: (id: number) => void }> =
  ({ id, current, latest, onSelect }) => {
    const [ref, near] = useNearView<HTMLButtonElement>();
    return (
      <button
        ref={ref}
        type="button"
        className={current ? `${classes.tile} ${classes.current}` : classes.tile}
        onClick={() => onSelect(id)}
        aria-current={current ? 'true' : undefined}
        data-current={current || undefined}
      >
        <span className={classes.art}>{near && <TileArt id={id} />}</span>
        <span className={classes.caption}>
          {id}
          {latest && (
            <span className={classes.latest}>
              <Trans>Latest</Trans>
            </span>
          )}
        </span>
      </button>
    );
  };

/**
 * Every Alp at a glance, newest first: tap one to show it, or type its number to jump straight there.
 */
const AlpBrowser: React.FC<{ currentId?: number; onDismiss: () => void }> = ({ currentId, onDismiss }) => {
  const lastId = useAppSelector(state => state.onDisplayAuction.lastAuctionAlpId);
  const dispatch = useAppDispatch();
  const history = useHistory();
  const [query, setQuery] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  const goTo = (id: number) => {
    dispatch(setOnDisplayAuctionAlpId(id));
    history.push(alpPath(id));
    onDismiss();
  };

  // Typing narrows the grid to matching numbers, with an exact match first
  const ids = useMemo(() => {
    if (lastId === undefined) return [];
    const all = Array.from({ length: lastId + 1 }, (_, i) => lastId - i);
    if (!query) return all;
    const exact = Number(query);
    const matches = all.filter(id => String(id).includes(query) && id !== exact);
    return exact <= lastId ? [exact, ...matches] : matches;
  }, [lastId, query]);

  const typed = query ? Number(query) : undefined;
  const canGo = typed !== undefined && lastId !== undefined && typed <= lastId;

  // Open with the Alp on display in view
  useLayoutEffect(() => {
    const grid = gridRef.current;
    const tile = grid?.querySelector<HTMLElement>('[data-current]');
    if (grid && tile) grid.scrollTop = tile.offsetTop - grid.clientHeight / 2 + tile.clientHeight / 2;
  }, []);

  // Close on Escape, and hold the page still behind the sheet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDismiss();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onDismiss]);

  // Focusing the field straight away would cover the grid with the keyboard on phones
  const focusOnOpen = useMemo(() => window.matchMedia?.('(hover: hover)').matches ?? false, []);

  return ReactDOM.createPortal(
    <>
      <div className={classes.backdrop} onClick={onDismiss} />
      <div className={classes.sheet} role="dialog" aria-modal="true" aria-labelledby="alp-browser-title">
        <div className={classes.header}>
          <h2 id="alp-browser-title">
            <Trans>Browse Alps</Trans>
          </h2>
          <button type="button" className={classes.close} onClick={onDismiss} aria-label="Close">
            ×
          </button>
        </div>
        <form
          className={classes.search}
          onSubmit={e => {
            e.preventDefault();
            if (canGo) goTo(typed!);
          }}
        >
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            autoFocus={focusOnOpen}
            aria-label="Alp number"
            placeholder={lastId !== undefined ? `Go to Alp 0 – ${lastId}` : 'Go to Alp'}
            value={query}
            onChange={e => setQuery(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 6))}
          />
          <button type="submit" disabled={!canGo}>
            <Trans>Go</Trans>
          </button>
        </form>
        <div ref={gridRef} className={classes.grid}>
          {ids.map(id => (
            <Tile key={id} id={id} current={id === currentId} latest={id === lastId} onSelect={goTo} />
          ))}
          {typed !== undefined && lastId !== undefined && typed > lastId && (
            <p className={classes.empty}>
              <Trans>
                Alp {typed} hasn’t been minted yet. The latest is Alp {lastId}.
              </Trans>
            </p>
          )}
        </div>
      </div>
    </>,
    document.getElementById('overlay-root')!,
  );
};

export default AlpBrowser;
