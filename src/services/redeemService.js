
/**
 * Redeem Service
 * 
 * Client-side service for redeeming codes and managing admin code generation.
 */

import { auth } from './firebase';

const API_BASE = '/api';

/**
 * Get current user's Firebase ID token
 */
async function getAuthToken() {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('请先登录');
    }
    return user.getIdToken();
}

/**
 * Redeem a code for system credits
 * @param {string} code - The redemption code (case insensitive)
 * @returns {Promise<Object>} - Result { success, addedCredits, totalBonus, message }
 */
export async function redeemCode(code) {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE}/redeem`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || '兑换失败');
        }

        return data;
    } catch (error) {
        throw error;
    }
}

/**
 * Admin: Generate new codes
 * @param {number} amount - Credits per code (ignored for Pro type)
 * @param {number} count - Number of codes to generate
 * @param {string} note - Optional note
 * @param {'credits'|'pro'} type - Code type: 'credits' or 'pro'
 * @returns {Promise<Object>}
 */
export async function generateCodes(amount, count, note = '', type = 'credits') {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE}/admin/codes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ amount, count, note, type })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || '生成失败');
        }

        return data;
    } catch (error) {
        throw error;
    }
}
