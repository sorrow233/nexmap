/**
 * Detect if user is likely from China based on timezone and language.
 * Used to hide payment features due to regulatory restrictions.
 */
export const isLikelyChinaUser = () => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const lang = navigator.language || navigator.userLanguage || '';

        const isChinese = lang.toLowerCase().startsWith('zh');

        // Only block mainland China timezones to avoid blocking users in Japan/Korea
        // who prefer Chinese UI but should have access to payment features
        const chinaTimezones = ['Asia/Shanghai', 'Asia/Urumqi', 'Asia/Chongqing', 'Asia/Harbin'];
        return chinaTimezones.includes(tz) && isChinese;
    } catch (e) {
        return false;
    }
};
