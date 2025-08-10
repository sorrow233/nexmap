/**
 * Detect if user is likely from China based on timezone and language.
 * Used to hide payment features due to regulatory restrictions.
 */
export const isLikelyChinaUser = () => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const lang = navigator.language || navigator.userLanguage || '';
        // China timezone is Asia/Shanghai or Asia/Urumqi, and language zh-CN
        const chinaTimezones = ['Asia/Shanghai', 'Asia/Urumqi', 'Asia/Chongqing', 'Asia/Harbin'];
        return chinaTimezones.includes(tz) && lang.toLowerCase().startsWith('zh-cn');
    } catch (e) {
        return false;
    }
};
