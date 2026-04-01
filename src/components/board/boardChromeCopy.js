const BOARD_CHROME_COPY = {
    en: {
        boardLabel: 'Board',
        mobileBoardLabel: 'Mobile Board',
        gallery: 'Gallery',
        undo: 'Undo',
        redo: 'Redo',
        forceSync: 'Force Sync',
        forceSyncing: 'Syncing',
        forceSyncTitle: 'Use this device as the source of truth and overwrite the remote board on other devices.',
        forceSyncingTitle: 'Forcing this board to overwrite the remote copy on other devices.',
        save: {
            idle: 'Saved',
            saved: 'Saved',
            saving: 'Saving',
            local_dirty: 'Queued',
            error: 'Save failed',
            savedJustNow: 'Saved just now',
            savedPrefix: 'Last saved',
            queuedDetail: 'Changes are queued for background save.',
            savingDetail: 'Saving in the background without blocking editing.',
            errorDetail: 'Please retry after checking local storage availability.'
        }
    },
    zh: {
        boardLabel: '画板',
        mobileBoardLabel: '移动画板',
        gallery: '画廊',
        undo: '撤销',
        redo: '重做',
        forceSync: '强制同步',
        forceSyncing: '同步中',
        forceSyncTitle: '以当前设备为准，强制覆盖其他设备上的远端画布。',
        forceSyncingTitle: '正在把当前画布强制覆盖到其他设备的远端副本。',
        save: {
            idle: '已保存',
            saved: '已保存',
            saving: '保存中',
            local_dirty: '已排队',
            error: '保存失败',
            savedJustNow: '刚刚保存',
            savedPrefix: '上次保存',
            queuedDetail: '更改已加入后台保存队列。',
            savingDetail: '正在后台保存，不会打断你的编辑。',
            errorDetail: '请检查本地存储空间后重试。'
        }
    },
    ja: {
        boardLabel: 'ボード',
        mobileBoardLabel: 'モバイルボード',
        gallery: 'ギャラリー',
        undo: '元に戻す',
        redo: 'やり直す',
        forceSync: '強制同期',
        forceSyncing: '同期中',
        forceSyncTitle: 'このデバイスを正とし、他のデバイス上のリモートボードを強制的に上書きします。',
        forceSyncingTitle: 'このボードで他のデバイス上のリモートコピーを上書きしています。',
        save: {
            idle: '保存済み',
            saved: '保存済み',
            saving: '保存中',
            local_dirty: '待機中',
            error: '保存失敗',
            savedJustNow: 'たった今保存',
            savedPrefix: '前回保存',
            queuedDetail: '変更はバックグラウンド保存の待機列に入っています。',
            savingDetail: '編集中でもバックグラウンドで保存しています。',
            errorDetail: 'ローカルストレージを確認してから再試行してください。'
        }
    },
    ko: {
        boardLabel: '보드',
        mobileBoardLabel: '모바일 보드',
        gallery: '갤러리',
        undo: '실행 취소',
        redo: '다시 실행',
        forceSync: '강제 동기화',
        forceSyncing: '동기화 중',
        forceSyncTitle: '현재 기기를 기준으로 다른 기기의 원격 보드를 강제로 덮어씁니다.',
        forceSyncingTitle: '현재 보드로 다른 기기의 원격 사본을 덮어쓰는 중입니다.',
        save: {
            idle: '저장됨',
            saved: '저장됨',
            saving: '저장 중',
            local_dirty: '대기 중',
            error: '저장 실패',
            savedJustNow: '방금 저장됨',
            savedPrefix: '마지막 저장',
            queuedDetail: '변경 사항이 백그라운드 저장 대기열에 있습니다.',
            savingDetail: '편집을 막지 않고 백그라운드에서 저장 중입니다.',
            errorDetail: '로컬 저장소 상태를 확인한 뒤 다시 시도해 주세요.'
        }
    }
};

const getLocale = (language = 'en') => BOARD_CHROME_COPY[language] || BOARD_CHROME_COPY.en;

const formatRelativeTimestamp = (language, timestamp, copy) => {
    const safeTimestamp = Number(timestamp) || 0;
    if (safeTimestamp <= 0) {
        return '';
    }

    const diffMs = Date.now() - safeTimestamp;
    if (!Number.isFinite(diffMs)) {
        return '';
    }

    const absMs = Math.abs(diffMs);
    if (absMs < 10_000) {
        return copy.savedJustNow;
    }

    const appendPrefix = (value) => (value ? `${copy.savedPrefix} ${value}` : '');
    const formatRelative = (value, unit) => {
        try {
            return new Intl.RelativeTimeFormat(language, {
                numeric: 'auto'
            }).format(value, unit);
        } catch {
            return '';
        }
    };

    if (absMs < 60_000) {
        return appendPrefix(formatRelative(-Math.round(diffMs / 1000), 'second'));
    }
    if (absMs < 3_600_000) {
        return appendPrefix(formatRelative(-Math.round(diffMs / 60_000), 'minute'));
    }
    if (absMs < 86_400_000) {
        return appendPrefix(formatRelative(-Math.round(diffMs / 3_600_000), 'hour'));
    }

    try {
        const formatted = new Intl.DateTimeFormat(language, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }).format(safeTimestamp);
        return `${copy.savedPrefix} ${formatted}`;
    } catch {
        return '';
    }
};

export const getBoardChromeCopy = (language = 'en') => getLocale(language);

export const getBoardSaveStatusMeta = ({ language = 'en', saveStatus = 'idle', lastSavedAt = 0 } = {}) => {
    const locale = getLocale(language);
    const saveCopy = locale.save;
    const statusKey = Object.prototype.hasOwnProperty.call(saveCopy, saveStatus) ? saveStatus : 'idle';

    const detail = (() => {
        if (statusKey === 'saving') return saveCopy.savingDetail;
        if (statusKey === 'local_dirty') return saveCopy.queuedDetail;
        if (statusKey === 'error') return saveCopy.errorDetail;
        return formatRelativeTimestamp(language, lastSavedAt, saveCopy);
    })();

    return {
        label: saveCopy[statusKey],
        detail,
        a11yLabel: detail ? `${saveCopy[statusKey]}，${detail}` : saveCopy[statusKey],
        statusKey
    };
};
