import React from 'react';
import { collectionMatchesItem } from '../../data/libraryCollections.js';
import './CollectionRooms.css';

export default function CollectionRooms({ collections = [], items = [], universe = 'mcu', posterSrc, onSelectCollection, activeCollectionId, variant = 'archive' }) {
  return (
    <section className="collection-rooms spectrum-rooms" data-variant={variant} aria-label="Spectrum Rooms">
      <div className="collection-rooms__header"><p>Spectrum Rooms</p><h2>Choose a cinematic path</h2><span>{collections.length} curated rooms</span></div>
      <div className="collection-rooms__grid">
        {collections.map(collection => {
          const roomItems = items.filter(item => collectionMatchesItem(collection, item, { universe }));
          const watched = roomItems.filter(item => item.status === 'watched').length;
          const pct = roomItems.length ? Math.round((watched / roomItems.length) * 100) : 0;
          const preview = roomItems.slice(0, 4);
          return (
            <button type="button" className="collection-room-card spectrum-bento-card" key={collection.id} data-active={activeCollectionId === collection.id} style={{ '--room-accent': collection.accent || 'var(--s-accent)' }} onClick={() => onSelectCollection?.(collection)}>
              <span className="collection-room-card__icon">{collection.icon}</span>
              <span className="collection-room-card__content"><strong>{collection.title}</strong><small>{collection.description}</small><span className="collection-room-card__meter" aria-label={`${pct}% watched`}><i style={{ width: `${pct}%` }}/></span><em>{roomItems.length} items · {watched} watched</em></span>
              <span className="collection-room-card__posters" aria-hidden="true">{preview.map((item, index) => posterSrc?.(item) && <img key={item.id} src={posterSrc(item)} alt="" style={{ '--stack-index': index }}/>)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
