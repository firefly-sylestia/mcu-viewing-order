// REMOVED: useLenis custom scroll interception.
// Intercepting wheel events with passive:false + preventDefault + scrollBy
// creates a synchronous JS bottleneck that causes scroll jank, especially
// when combined with React state updates on every scroll tick.
// The browser's native scrolling is always smoother and more efficient.
export const useLenis = () => {};
