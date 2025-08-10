/**
 * Detect if user is likely from China based on timezone and language.
 * Used to hide payment features due to regulatory restrictions.
 */
export const isLikelyChinaUser = () => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const lang = navigator.language || navigator.userLanguage || '';

        const isChinese = lang.toLowerCase().startsWith('zh');
        const isAsiaTimezone = tz.startsWith('Asia/');

        // Stricter check: If user interface is Chinese AND they are in an Asia timezone, 
        // assume they might be in China or subject to similar restrictions/preferences.
        // This covers Asia/Tokyo (+09:00) users who use Chinese UI (like the current user).
        if (isChinese && isAsiaTimezone) {
            return true;
        }

        // Keep explicit mainland check just in case
        const chinaTimezones = ['Asia/Shanghai', 'Asia/Urumqi', 'Asia/Chongqing', 'Asia/Harbin'];
        return chinaTimezones.includes(tz) && isChinese;
    } catch (e) {
        return false;
    }
};
