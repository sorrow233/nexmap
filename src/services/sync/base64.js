export const bytesToBase64 = (bytes) => {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
};

export const base64ToBytes = (encoded = '') => {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
};

export const estimateTextBytes = (value = '') => {
    try {
        return new TextEncoder().encode(value).length;
    } catch {
        return value.length;
    }
};
