// Ikon SVG yang digambar sendiri, supaya tidak perlu library ikon.
export const IKON = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    unduh: '<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>'
};

export type NamaIkon = keyof typeof IKON;
