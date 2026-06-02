import React from 'react';

const Icon = ({ children, size = 16, style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);

export const Search = p => <Icon {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></Icon>;
export const Eye = p => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></Icon>;
export const EyeOff = p => <Icon {...p}><path d="m3 3 18 18"/><path d="M10.5 10.5a2 2 0 0 0 3 3"/><path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-3.2 4.2"/><path d="M6.6 6.6A17.5 17.5 0 0 0 2 12s3.5 8 10 8a10.7 10.7 0 0 0 5.4-1.4"/></Icon>;
export const Film = p => <Icon {...p}><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20"/><path d="M17 2v20"/><path d="M2 7h20"/><path d="M2 17h20"/></Icon>;
export const Tv = p => <Icon {...p}><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M17 2 12 7 7 2"/></Icon>;
export const Zap = p => <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>;
export const ChevDown = p => <Icon {...p}><path d="m6 9 6 6 6-6"/></Icon>;
export const ChevRight = p => <Icon {...p}><path d="m9 6 6 6-6 6"/></Icon>;
export const ArrowUpDown = p => <Icon {...p}><path d="m7 7 5-5 5 5"/><path d="M12 2v20"/><path d="m17 17-5 5-5-5"/></Icon>;
export const Check = p => <Icon {...p}><path d="M20 6 9 17l-5-5"/></Icon>;
export const Clock = p => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></Icon>;
export const Heart = p => <Icon {...p}><path d="M12 20.8s-7.4-4.7-9.4-8.7C1 9.3 2.8 5.2 6.2 5.2c2.2 0 3.6 1.2 4.5 2.6.9-1.4 2.3-2.6 4.5-2.6 3.4 0 5.2 4.1 3.6 6.9-2 4-9.4 8.7-9.4 8.7z"/></Icon>;
export const Pause = p => <Icon {...p}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></Icon>;
export const Trash2 = p => <Icon {...p}><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></Icon>;
export const Upload = p => <Icon {...p}><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M20 16v4H4v-4"/></Icon>;
export const Download = p => <Icon {...p}><path d="M12 4v12"/><path d="m17 11-5 5-5-5"/><path d="M20 20H4"/></Icon>;
export const Sun = p => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></Icon>;
export const Star = p => <Icon {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Icon>;
export const Moon = p => <Icon {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></Icon>;
export const Settings = p => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.02.02a2 2 0 1 1-2.83 2.83l-.02-.02A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.03a1.7 1.7 0 0 0-.4-1.1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.02.02a2 2 0 1 1-2.83-2.83l.02-.02A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.9a2 2 0 1 1 0-4h.03a1.7 1.7 0 0 0 1.1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.02-.02a2 2 0 1 1 2.83-2.83l.02.02A1.7 1.7 0 0 0 9 4.6c.4 0 .78-.2 1-.6.25-.31.39-.7.4-1.1V2.9a2 2 0 1 1 4 0v.03c0 .4.15.79.4 1.1.22.4.6.6 1 .6.67.07 1.34-.16 1.87-.62l.02-.02a2 2 0 1 1 2.83 2.83l-.02.02a1.7 1.7 0 0 0-.34 1.87c0 .4.2.78.6 1 .31.25.7.39 1.1.4h.03a2 2 0 1 1 0 4h-.03a1.7 1.7 0 0 0-1.1.4 1.7 1.7 0 0 0-.6 1z"/></Icon>;
export const Info = p => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></Icon>;
export const Bookmark = p => <Icon {...p}><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"/></Icon>;
export const Layers = p => <Icon {...p}><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></Icon>;
export const PlayCircle = p => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4V8z"/></Icon>;
export const PauseCircle = p => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M10 9v6M14 9v6"/></Icon>;
export const XCircle = p => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></Icon>;
export const SlidersH = p => <Icon {...p}><line x1="21" y1="4" x2="14" y2="4"/><line x1="10" y1="4" x2="3" y2="4"/><circle cx="12" cy="4" r="2"/><line x1="21" y1="12" x2="12" y2="12"/><line x1="8" y1="12" x2="3" y2="12"/><circle cx="10" cy="12" r="2"/><line x1="21" y1="20" x2="16" y2="20"/><line x1="12" y1="20" x2="3" y2="20"/><circle cx="14" cy="20" r="2"/></Icon>;
export const UserCircle = p => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 20c1.9-3.4 5-5 8-5s6.1 1.6 8 5"/></Icon>;
export const Menu = p => <Icon {...p}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></Icon>;
export const SwitchIcon = p => <Icon {...p}><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M21 8a9 9 0 0 0-15-3"/><path d="M3 16a9 9 0 0 0 15 3"/></Icon>;
export const X = p => <Icon {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></Icon>;
