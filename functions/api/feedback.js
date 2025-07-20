/**
 * Feedback System API
 * 
 * Endpoints:
 * - GET /api/feedback - Get all feedback (with sorting: hot/top/recent)
 * - POST /api/feedback - Submit new feedback (email validation required)
 * - PUT /api/feedback - Vote on feedback
 */

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

// Email validation: only major email providers allowed
// Gmail, QQ, Outlook/Hotmail, 163/126, iCloud
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const validEmailRegex = /^[^@\s]+@(gmail\.com|qq\.com|outlook\.com|hotmail\.com|live\.com|163\.com|126\.com|icloud\.com)$/i;
    return validEmailRegex.test(email.trim());
}

// Mask email for display (e.g., use***@gmail.com)
function maskEmail(email) {
    if (!email) return 'Anonymous';
    const [local, domain] = email.split('@');
    if (local.length <= 3) {
        return `${local[0]}**@${domain}`;
    }
    return `${local.substring(0, 3)}***@${domain}`;
}

// Calculate hot score (votes + recency bonus)
function calculateHotScore(votes, createdAt) {
    const ageInHours = (Date.now() - createdAt) / (1000 * 60 * 60);
    const recencyBonus = Math.max(0, 48 - ageInHours) / 48; // Bonus for posts < 48h old
    return votes + (recencyBonus * 10);
}

export async function onRequest(context) {
    const { request, env } = context;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Initialize Firestore REST API base URL
        const projectId = 'amecatzz';
        const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

        // Extract Authorization header to forward to Firestore
        const authHeader = request.headers.get('Authorization');

        if (request.method === 'GET') {
            const url = new URL(request.url);
            // Check if it's a comments request
            if (url.searchParams.has('feedbackId')) {
                return handleGetComments(request, firestoreBase, authHeader);
            }
            return handleGet(request, firestoreBase, authHeader);
        } else if (request.method === 'POST') {
            const url = new URL(request.url);
            // Check if it's a comment submission
            if (url.searchParams.has('feedbackId')) {
                return handlePostComment(request, firestoreBase, authHeader);
            }
            return handlePost(request, firestoreBase, authHeader);
        } else if (request.method === 'PUT') {
            return handlePut(request, firestoreBase, authHeader);
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: corsHeaders
        });
    } catch (error) {
        console.error('Feedback API error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders
        });
    }
}

// Helper to add auth header
function getFirestoreHeaders(authHeader) {
    const headers = { 'Content-Type': 'application/json' };
    if (authHeader) {
        headers['Authorization'] = authHeader;
    }
    return headers;
}

// GET: Fetch all feedback
async function handleGet(request, firestoreBase, authHeader) {
    const url = new URL(request.url);
    const sort = url.searchParams.get('sort') || 'hot'; // hot, top, recent

    try {
        // Fetch all feedback documents
        const response = await fetch(`${firestoreBase}/feedback`, {
            headers: getFirestoreHeaders(authHeader)
        });

        if (!response.ok) {
            // Collection might not exist yet
            if (response.status === 404) {
                return new Response(JSON.stringify({ feedbacks: [] }), {
                    headers: corsHeaders
                });
            }
            // If permission denied on GET, it might be because public read is also disabled.
            // We can return empty list or throw. Returning empty list is safer for UI.
            if (response.status === 403) {
                console.warn('Firestore GET 403: Permission denied (User not logged in?)');
                // For GET, maybe we want to allow public read? If not, return empty.
                // But better to throw so we know.
                // Actually, if we want to show feedback to everyone, RULES must allow read.
                // If rules require auth, then only logged in users see feedback.
            }
            throw new Error(`Firestore error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Parse Firestore documents
        let feedbacks = (data.documents || []).map(doc => {
            const fields = doc.fields || {};
            const id = doc.name.split('/').pop();
            const createdAt = fields.createdAt?.timestampValue
                ? new Date(fields.createdAt.timestampValue).getTime()
                : Date.now();
            const votes = parseInt(fields.votes?.integerValue || '0');

            return {
                id,
                email: maskEmail(fields.email?.stringValue),
                displayName: fields.displayName?.stringValue || null,
                photoURL: fields.photoURL?.stringValue || null,
                content: fields.content?.stringValue || fields.title?.stringValue || '',
                status: fields.status?.stringValue || 'pending',
                votes,
                comments: parseInt(fields.comments?.integerValue || '0'),
                createdAt,
                hotScore: calculateHotScore(votes, createdAt)
            };
        });

        // Sort based on parameter
        if (sort === 'hot') {
            feedbacks.sort((a, b) => b.hotScore - a.hotScore);
        } else if (sort === 'top') {
            feedbacks.sort((a, b) => b.votes - a.votes);
        } else if (sort === 'recent') {
            feedbacks.sort((a, b) => b.createdAt - a.createdAt);
        }

        return new Response(JSON.stringify({ feedbacks }), {
            headers: corsHeaders
        });
    } catch (error) {
        console.error('GET feedback error:', error);
        return new Response(JSON.stringify({ feedbacks: [], error: error.message }), {
            headers: corsHeaders
        });
    }
}

// POST: Submit new feedback
async function handlePost(request, firestoreBase, authHeader) {
    const body = await request.json();
    const { email, content, displayName, photoURL, uid } = body;

    // If user is logged in (has uid), use their info directly
    // Otherwise, validate email
    if (!uid && !isValidEmail(email)) {
        return new Response(JSON.stringify({
            error: 'Invalid email. Only major email providers (Gmail, QQ, Outlook, 163, iCloud) are allowed.',
            code: 'INVALID_EMAIL'
        }), {
            status: 400,
            headers: corsHeaders
        });
    }

    // Validate content (at least 1 character)
    if (!content || content.trim().length < 1) {
        return new Response(JSON.stringify({
            error: 'Content is required.',
            code: 'INVALID_CONTENT'
        }), {
            status: 400,
            headers: corsHeaders
        });
    }

    // Create feedback document
    const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const userEmail = uid ? (email || `user_${uid}`) : email.trim().toLowerCase();

    const firestoreDoc = {
        fields: {
            email: { stringValue: userEmail },
            content: { stringValue: content.trim() },
            displayName: { stringValue: displayName || '' },
            photoURL: { stringValue: photoURL || '' },
            uid: { stringValue: uid || '' },
            status: { stringValue: 'pending' },
            votes: { integerValue: '1' }, // Start with 1 vote (self-vote)
            voterEmails: {
                arrayValue: {
                    values: [{ stringValue: userEmail }]
                }
            },
            comments: { integerValue: '0' },
            createdAt: { timestampValue: now }
        }
    };

    try {
        const response = await fetch(`${firestoreBase}/feedback?documentId=${feedbackId}`, {
            method: 'POST',
            headers: getFirestoreHeaders(authHeader),
            body: JSON.stringify(firestoreDoc)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to create feedback: ${errorData}`);
        }

        return new Response(JSON.stringify({
            success: true,
            id: feedbackId,
            message: 'Feedback submitted successfully!'
        }), {
            status: 201,
            headers: corsHeaders
        });
    } catch (error) {
        console.error('POST feedback error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders
        });
    }
}

// PUT: Vote on feedback
async function handlePut(request, firestoreBase, authHeader) {
    const body = await request.json();
    const { feedbackId, action, uid } = body; // action: 'upvote' or 'downvote', uid required

    if (!feedbackId) {
        return new Response(JSON.stringify({ error: 'Feedback ID is required' }), {
            status: 400,
            headers: corsHeaders
        });
    }

    // Require user to be logged in (uid must be provided)
    if (!uid) {
        return new Response(JSON.stringify({ error: 'Login required to vote' }), {
            status: 401,
            headers: corsHeaders
        });
    }

    // Use UID as voter identifier for consistency
    const voterIdentifier = uid;

    try {
        // Fetch the current feedback document
        const getResponse = await fetch(`${firestoreBase}/feedback/${feedbackId}`, {
            headers: getFirestoreHeaders(authHeader)
        });

        if (!getResponse.ok) {
            return new Response(JSON.stringify({ error: 'Feedback not found' }), {
                status: 404,
                headers: corsHeaders
            });
        }

        const docData = await getResponse.json();
        const fields = docData.fields || {};

        // Get current votes and voter list (now using UIDs)
        let currentVotes = parseInt(fields.votes?.integerValue || '0');
        let voterUids = (fields.voterUids?.arrayValue?.values || [])
            .map(v => v.stringValue)
            .filter(Boolean);

        // Legacy support: also check voterEmails if voterUids doesn't exist
        if (voterUids.length === 0) {
            voterUids = (fields.voterEmails?.arrayValue?.values || [])
                .map(v => v.stringValue)
                .filter(Boolean);
        }

        // Check if this user already voted on this feedback
        const hasVoted = voterUids.includes(voterIdentifier);

        if (action === 'upvote') {
            if (hasVoted) {
                // Already voted - remove vote (toggle off)
                currentVotes = Math.max(0, currentVotes - 1);
                voterUids = voterUids.filter(e => e !== voterIdentifier);
            } else {
                // Add vote
                currentVotes += 1;
                voterUids.push(voterIdentifier);
            }
        } else if (action === 'downvote') {
            if (hasVoted) {
                // Remove vote
                currentVotes = Math.max(0, currentVotes - 1);
                voterUids = voterUids.filter(e => e !== voterIdentifier);
            }
        }

        // Update the document
        const updateDoc = {
            fields: {
                ...fields,
                votes: { integerValue: String(currentVotes) },
                voterUids: {
                    arrayValue: {
                        values: voterUids.map(e => ({ stringValue: e }))
                    }
                }
            }
        };

        const updateResponse = await fetch(`${firestoreBase}/feedback/${feedbackId}`, {
            method: 'PATCH',
            headers: getFirestoreHeaders(authHeader),
            body: JSON.stringify(updateDoc)
        });

        if (!updateResponse.ok) {
            throw new Error('Failed to update feedback');
        }

        return new Response(JSON.stringify({ success: true, votes: currentVotes }), {
            headers: corsHeaders
        });

    } catch (error) {
        console.error('PUT feedback error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders
        });
    }
}

// GET: Fetch comments for a feedback
async function handleGetComments(request, firestoreBase, authHeader) {
    const url = new URL(request.url);
    const feedbackId = url.searchParams.get('feedbackId');

    try {
        const response = await fetch(`${firestoreBase}/feedback/${feedbackId}/comments`, {
            headers: getFirestoreHeaders(authHeader)
        });

        if (!response.ok) {
            if (response.status === 404) {
                return new Response(JSON.stringify({ comments: [] }), { headers: corsHeaders });
            }
            throw new Error(`Firestore error: ${response.status}`);
        }

        const data = await response.json();
        const comments = (data.documents || []).map(doc => {
            const fields = doc.fields || {};
            return {
                id: doc.name.split('/').pop(),
                email: maskEmail(fields.email?.stringValue),
                displayName: fields.displayName?.stringValue || null,
                photoURL: fields.photoURL?.stringValue || null,
                content: fields.content?.stringValue || '',
                createdAt: fields.createdAt?.timestampValue ? new Date(fields.createdAt.timestampValue).getTime() : Date.now()
            };
        }).sort((a, b) => a.createdAt - b.createdAt);

        return new Response(JSON.stringify({ comments }), { headers: corsHeaders });
    } catch (error) {
        return new Response(JSON.stringify({ comments: [], error: error.message }), { headers: corsHeaders });
    }
}

// POST: Submit a comment
async function handlePostComment(request, firestoreBase, authHeader) {
    const url = new URL(request.url);
    const feedbackId = url.searchParams.get('feedbackId');
    const body = await request.json();
    const { email, content, displayName, photoURL, uid } = body;

    // Validate email if no uid (guest)
    if (!uid && !isValidEmail(email)) {
        return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: corsHeaders });
    }

    if (!content || !content.trim()) {
        return new Response(JSON.stringify({ error: 'Content required' }), { status: 400, headers: corsHeaders });
    }

    const commentId = `cm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const userEmail = uid ? (email || `user_${uid}`) : email.trim().toLowerCase();

    const firestoreDoc = {
        fields: {
            email: { stringValue: userEmail },
            content: { stringValue: content.trim() },
            displayName: { stringValue: displayName || '' },
            photoURL: { stringValue: photoURL || '' },
            uid: { stringValue: uid || '' },
            createdAt: { timestampValue: now }
        }
    };

    try {
        // 1. Create comment
        const response = await fetch(`${firestoreBase}/feedback/${feedbackId}/comments?documentId=${commentId}`, {
            method: 'POST',
            headers: getFirestoreHeaders(authHeader),
            body: JSON.stringify(firestoreDoc)
        });

        if (!response.ok) throw new Error('Failed to create comment');

        // 2. Increment comment count on feedback doc (Simple GET-UPDATE flow)
        const getFbResponse = await fetch(`${firestoreBase}/feedback/${feedbackId}`, {
            headers: getFirestoreHeaders(authHeader)
        });
        if (getFbResponse.ok) {
            const fbData = await getFbResponse.json();
            const currentComments = parseInt(fbData.fields?.comments?.integerValue || '0');

            await fetch(`${firestoreBase}/feedback/${feedbackId}`, {
                method: 'PATCH',
                headers: getFirestoreHeaders(authHeader),
                body: JSON.stringify({
                    fields: { comments: { integerValue: String(currentComments + 1) } }
                })
            });
        }

        return new Response(JSON.stringify({ success: true, id: commentId }), { status: 201, headers: corsHeaders });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
}
