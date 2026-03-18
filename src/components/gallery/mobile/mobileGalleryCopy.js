const MOBILE_GALLERY_COPY = {
    en: {
        homeLabel: 'iPhone Home',
        studioBadge: 'iOS Studio'
    },
    zh: {
        homeLabel: 'iPhone 首页',
        studioBadge: 'iOS 工作台'
    },
    ja: {
        homeLabel: 'iPhone Home',
        studioBadge: 'iOS Studio'
    },
    ko: {
        homeLabel: 'iPhone Home',
        studioBadge: 'iOS Studio'
    }
};

export function getMobileGalleryCopy(language = 'en') {
    return MOBILE_GALLERY_COPY[language] || MOBILE_GALLERY_COPY.en;
}
