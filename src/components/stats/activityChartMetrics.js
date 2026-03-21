const TIME_SEGMENT_RANGES = {
    morning: '06:00-11:59',
    afternoon: '12:00-17:59',
    evening: '18:00-23:59',
    night: '00:00-05:59'
};

const toLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const toChartDate = (item, viewMode) => {
    if (item?.date) {
        return item.date;
    }

    if (viewMode === 'year' && Number.isInteger(item?.monthIndex)) {
        const year = item?.year || new Date().getFullYear();
        return toLocalDateString(new Date(year, item.monthIndex, 1));
    }

    return '';
};

const getMonthDayLabel = (date, language) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
    }

    const month = date.getMonth() + 1;
    const day = date.getDate();
    if ((day !== 1 && day !== new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()) && day % 5 !== 0) {
        return '';
    }

    return language?.startsWith('zh') ? `${month}/${day}` : `${month}/${day}`;
};

const getAxisLabel = (dateString, viewMode, language) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';

    if (viewMode === 'week') {
        return new Intl.DateTimeFormat(language, { weekday: 'short' }).format(date);
    }

    if (viewMode === 'month') {
        return getMonthDayLabel(date, language);
    }

    return new Intl.DateTimeFormat(language, { month: 'short' }).format(date);
};

const getDetailLabel = (dateString, viewMode, language) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;

    if (viewMode === 'week') {
        return new Intl.DateTimeFormat(language, {
            month: 'short',
            day: 'numeric',
            weekday: 'short'
        }).format(date);
    }

    if (viewMode === 'month') {
        return new Intl.DateTimeFormat(language, {
            month: 'short',
            day: 'numeric'
        }).format(date);
    }

    return new Intl.DateTimeFormat(language, {
        year: 'numeric',
        month: 'long'
    }).format(date);
};

export const formatCompactNumber = (value, language = 'en') => {
    const normalized = Number.isFinite(value) ? value : 0;
    if (Math.abs(normalized) < 1000) {
        return Math.round(normalized).toLocaleString(language);
    }

    return new Intl.NumberFormat(language, {
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(normalized);
};

export const buildActivityChartData = (sourceData = [], viewMode = 'week', language = 'en') => (
    sourceData.map((item, index) => {
        const date = toChartDate(item, viewMode);
        const chars = Number(item?.chars || 0);

        return {
            ...item,
            chars,
            date,
            key: item?.date || `${viewMode}-${index}`,
            axisLabel: getAxisLabel(date, viewMode, language),
            detailLabel: getDetailLabel(date, viewMode, language)
        };
    })
);

export const getActivityInsights = ({ data = [], timeDistribution = null }) => {
    const totalChars = data.reduce((sum, item) => sum + (item?.chars || 0), 0);
    const activePeriods = data.filter(item => (item?.chars || 0) > 0).length;
    const totalPeriods = data.length;
    const averageChars = totalPeriods > 0 ? totalChars / totalPeriods : 0;
    const activeAverageChars = activePeriods > 0 ? totalChars / activePeriods : 0;
    const peakItem = data.reduce((peak, item) => {
        if (!peak || (item?.chars || 0) > (peak?.chars || 0)) {
            return item;
        }
        return peak;
    }, null);

    const distributionTotal = timeDistribution
        ? Object.values(timeDistribution).reduce((sum, value) => sum + (value || 0), 0)
        : 0;

    const dominantTimeKey = distributionTotal > 0
        ? Object.entries(timeDistribution).reduce((current, entry) => (
            entry[1] > current[1] ? entry : current
        ), ['morning', timeDistribution?.morning || 0])[0]
        : null;

    return {
        totalChars,
        activePeriods,
        totalPeriods,
        activeRate: totalPeriods > 0 ? activePeriods / totalPeriods : 0,
        averageChars,
        activeAverageChars,
        peakItem,
        peakShare: totalChars > 0 && peakItem ? peakItem.chars / totalChars : 0,
        distributionTotal,
        dominantTimeKey
    };
};

export const getTimeDistributionSegments = (timeDistribution = {}, t) => {
    const total = Object.values(timeDistribution).reduce((sum, value) => sum + (value || 0), 0);
    const items = [
        { key: 'morning', label: t?.stats?.morning || 'Morning', color: '#fbbf24', softColor: '#fde68a' },
        { key: 'afternoon', label: t?.stats?.afternoon || 'Afternoon', color: '#fb923c', softColor: '#fdba74' },
        { key: 'evening', label: t?.stats?.evening || 'Evening', color: '#818cf8', softColor: '#a5b4fc' },
        { key: 'night', label: t?.stats?.night || 'Night', color: '#c084fc', softColor: '#d8b4fe' }
    ];

    return items.map((item) => {
        const value = Number(timeDistribution[item.key] || 0);
        const percentage = total > 0 ? value / total : 0;

        return {
            ...item,
            value,
            percentage,
            rangeLabel: TIME_SEGMENT_RANGES[item.key]
        };
    });
};
