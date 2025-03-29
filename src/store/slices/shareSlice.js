export const createShareSlice = (set) => ({
    shareModal: {
        isOpen: false,
        cardContent: null,
        theme: 'business', // 'business' | 'tech'
        showWatermark: true
    },
    openShareModal: (content) => set((state) => ({
        shareModal: { ...state.shareModal, isOpen: true, cardContent: content }
    })),
    closeShareModal: () => set((state) => ({
        shareModal: { ...state.shareModal, isOpen: false, cardContent: null }
    })),
    setShareTheme: (theme) => set((state) => ({
        shareModal: { ...state.shareModal, theme }
    })),
    toggleShareWatermark: () => set((state) => ({
        shareModal: { ...state.shareModal, showWatermark: !state.shareModal.showWatermark }
    }))
});
