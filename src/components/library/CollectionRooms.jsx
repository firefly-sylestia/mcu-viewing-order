import React from 'react';
import { collectionMatchesItem } from '../../data/libraryCollections.js';
import './CollectionRooms.css';

export default function CollectionRooms({ collections = [], items = [], universe = 'mcu', posterSrc, onSelectCollection, activeCollectionId, variant = 'archive' }) {
  return (
    <section className="collection-rooms archive-shelf" data-variant={variant} aria-label="Collection rooms">
      <div className="collection-rooms__header">
        <p>Collection Rooms</p>
        <h2>Enter a themed room</h2>
      </div>
      <div className="collection-rooms__grid">
        {collections.map((collection) => {
          const roomItems = items.filter((item) => collectionMatchesItem(collection, item, { universe }));
          const watched = roomItems.filter((item) => item.status === 'watched').length;
          const pct = roomItems.length ? Math.round((watched / roomItems.length) * 100) : 0;
          const preview = roomItems.slice(0, 4);
          return (
            <button
              type="button"
              className="collection-room-card"
              key={collection.id}
              data-active={activeCollectionId === collection.id}
              style={{ '--room-accent': collection.accent }}
              onClick={() => onSelectCollection?.(collection)}
            >
              <span className="collection-room-card__icon">{collection.icon}</span>
              <span className="collection-room-card__content">
                <strong>{collection.title}</strong>
                <small>{collection.description}</small>
                <span className="collection-room-card__meter" aria-label={`${pct}% watched`}><i style={{ width: `${pct}%` }} /></span>
                <span className="collection-room-card__stats">{roomItems.length} items · {watched} watched</span>
              </span>
              <span className="collection-room-card__posters" aria-hidden="true">
                {preview.map((item, index) => <img key={item.id} src={posterSrc?.(item)} alt="" style={{ '--stack-index': index }} />)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
