// Global state
let allUpdates = [];
let filteredUpdates = [];
let currentFilterType = 'All';
let currentSearchQuery = '';
let currentSortOrder = 'newest';

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const exportBtn = document.getElementById('export-btn');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const typeFilters = document.getElementById('type-filters');
const updatesGrid = document.getElementById('updates-grid');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const lastFetchedText = document.getElementById('last-fetched-text');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const retryBtn = document.getElementById('retry-btn');

// Metric Count Elements
const countAll = document.getElementById('count-all');
const countFeatures = document.getElementById('count-features');
const countChanges = document.getElementById('count-changes');
const countBreaking = document.getElementById('count-breaking');
const countIssues = document.getElementById('count-issues');

// Metric Cards (Clickable)
const metricAll = document.getElementById('metric-all');
const metricFeatures = document.getElementById('metric-features');
const metricChanges = document.getElementById('metric-changes');
const metricBreaking = document.getElementById('metric-breaking');
const metricIssues = document.getElementById('metric-issues');

// Tweet Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const postTweetBtn = document.getElementById('post-tweet-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const charCountContainer = charCount.parentElement;
const previewBadgeType = document.getElementById('preview-badge-type');
const previewBadgeDate = document.getElementById('preview-badge-date');
const previewBadgeText = document.getElementById('preview-badge-text');

// Toast Container
const toastContainer = document.getElementById('toast-container');

/* ==========================================================================
   INITIALIZATION & DATA FETCHING
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes(false);
    setupEventListeners();
});

function setupEventListeners() {
    // Refresh button
    refreshBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Export CSV button
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }

    // Retry button on error screen
    retryBtn.addEventListener('click', () => {
        fetchReleaseNotes(false);
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase().trim();
        applyFiltersAndRender();
    });

    // Sort dropdown
    sortSelect.addEventListener('change', (e) => {
        currentSortOrder = e.target.value;
        applyFiltersAndRender();
    });

    // Category filter buttons
    typeFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            // Remove active class from all buttons
            typeFilters.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            // Add active to clicked button
            e.target.classList.add('active');
            
            currentFilterType = e.target.dataset.type;
            applyFiltersAndRender();
        }
    });

    // Clicking metric cards filters the list
    const metricCards = [metricAll, metricFeatures, metricChanges, metricBreaking, metricIssues];
    metricCards.forEach(card => {
        card.addEventListener('click', () => {
            const filterType = card.dataset.filter;
            // Find corresponding button in type-filters and click it
            const targetBtn = typeFilters.querySelector(`[data-type="${filterType}"]`);
            if (targetBtn) {
                targetBtn.click();
                // Smooth scroll to controls/feed section on mobile
                document.querySelector('.controls-card').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Clear filters button (empty state)
    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        const allBtn = typeFilters.querySelector('[data-type="All"]');
        if (allBtn) allBtn.click();
    });

    // Tweet modal close & cancel
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    
    // Close modal on overlay click
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Live tweet character counter
    tweetTextarea.addEventListener('input', updateTweetCharCount);
}

async function fetchReleaseNotes(forceRefresh = false) {
    showLoading(true);
    refreshBtn.classList.add('spinning');
    refreshBtn.disabled = true;
    
    const indicator = document.querySelector('.status-indicator');
    if (indicator) indicator.classList.add('loading');
    
    try {
        const url = `/api/updates${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            allUpdates = data.updates;
            
            // Format & update fetched time
            updateFetchedTimeLabel(data.last_fetched);
            
            // Calculate and display metrics
            updateMetrics(allUpdates);
            
            // Render
            applyFiltersAndRender();
            
            if (forceRefresh) {
                showToast('Success', 'Release notes updated successfully.', 'success');
            }
        } else {
            throw new Error(data.error || 'Failed to fetch release notes.');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showError(error.message);
        showToast('Error', 'Failed to retrieve release notes.', 'error');
    } finally {
        showLoading(false);
        refreshBtn.classList.remove('spinning');
        refreshBtn.disabled = false;
        if (indicator) indicator.classList.remove('loading');
    }
}

/* ==========================================================================
   UI STATE MANAGERS
   ========================================================================== */

function showLoading(isLoading) {
    if (isLoading) {
        loadingState.classList.remove('hidden');
        updatesGrid.classList.add('hidden');
        errorState.classList.add('hidden');
        emptyState.classList.add('hidden');
    } else {
        loadingState.classList.add('hidden');
    }
}

function showError(msg) {
    loadingState.classList.add('hidden');
    updatesGrid.classList.add('hidden');
    emptyState.classList.add('hidden');
    errorState.classList.remove('hidden');
    errorMessage.textContent = msg;
}

function updateFetchedTimeLabel(isoString) {
    const date = new Date(isoString);
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const timeStr = date.toLocaleTimeString(undefined, options);
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    lastFetchedText.textContent = `Last synced: ${dateStr} at ${timeStr}`;
}

/* ==========================================================================
   METRICS & COUNTERS
   ========================================================================== */

function updateMetrics(updates) {
    const counts = {
        All: updates.length,
        Feature: 0,
        Change: 0,
        Breaking: 0,
        Issue: 0
    };
    
    updates.forEach(up => {
        const type = up.type;
        if (type === 'Feature') counts.Feature++;
        else if (type === 'Change') counts.Change++;
        else if (type === 'Breaking' || type === 'Deprecated') counts.Breaking++;
        else if (type === 'Issue' || type === 'Fix' || type === 'Bug Fix') counts.Issue++;
    });
    
    countAll.textContent = counts.All;
    countFeatures.textContent = counts.Feature;
    countChanges.textContent = counts.Change;
    countBreaking.textContent = counts.Breaking;
    countIssues.textContent = counts.Issue;
}

/* ==========================================================================
   FILTERING AND SORTING LOGIC
   ========================================================================== */

function applyFiltersAndRender() {
    // 1. Filter by category
    filteredUpdates = allUpdates.filter(up => {
        if (currentFilterType === 'All') return true;
        
        // Handle variations in category naming
        if (currentFilterType === 'Breaking') {
            return up.type === 'Breaking' || up.type === 'Deprecated';
        }
        if (currentFilterType === 'Issue') {
            return up.type === 'Issue' || up.type === 'Fix' || up.type === 'Bug Fix';
        }
        
        return up.type === currentFilterType;
    });
    
    // 2. Filter by search query
    if (currentSearchQuery !== '') {
        filteredUpdates = filteredUpdates.filter(up => {
            return up.content_text.toLowerCase().includes(currentSearchQuery) ||
                   up.type.toLowerCase().includes(currentSearchQuery) ||
                   up.date.toLowerCase().includes(currentSearchQuery);
        });
    }
    
    // 3. Sort
    filteredUpdates.sort((a, b) => {
        // Date parsing (e.g. "June 15, 2026")
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (currentSortOrder === 'newest') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });
    
    // 4. Render Grid
    renderGrid(filteredUpdates);
}

/* ==========================================================================
   DOM RENDERING FOR CARDS
   ========================================================================== */

function renderGrid(updates) {
    updatesGrid.innerHTML = '';
    
    if (updates.length === 0) {
        updatesGrid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    updatesGrid.classList.remove('hidden');
    
    updates.forEach(up => {
        const card = document.createElement('article');
        
        // Standardize class type based on BQ categories
        let typeClass = 'type-feature';
        if (up.type === 'Change') typeClass = 'type-change';
        else if (up.type === 'Breaking' || up.type === 'Deprecated') typeClass = 'type-breaking';
        else if (up.type === 'Announcement') typeClass = 'type-announcement';
        else if (up.type === 'Issue' || up.type === 'Fix') typeClass = 'type-issue';
        
        card.className = `update-card ${typeClass}`;
        card.id = `card-${up.id}`;
        
        card.innerHTML = `
            <div class="card-header">
                <span class="type-badge">${up.type}</span>
                <span class="card-date">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    ${up.date}
                </span>
            </div>
            
            <div class="card-body">
                ${up.content_html}
            </div>
            
            <div class="card-actions">
                <div class="card-action-left">
                    <button class="btn-card-action btn-tweet-action" onclick="openTweetComposer('${escapeHtml(up.id)}')">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        Tweet
                    </button>
                    <button class="btn-card-action" onclick="copyUpdateText('${escapeHtml(up.id)}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy to Clipboard
                    </button>
                </div>
                <a href="${up.link}" target="_blank" rel="noopener" class="btn-card-action" title="View official release notes source page">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
            </div>
        `;
        
        updatesGrid.appendChild(card);
    });
}

/* ==========================================================================
   TWEET SHARING FEATURES
   ========================================================================== */

function openTweetComposer(updateId) {
    const update = allUpdates.find(up => up.id === updateId);
    if (!update) return;
    
    // Format card preview inside the modal
    previewBadgeType.textContent = update.type.toUpperCase();
    previewBadgeDate.textContent = update.date;
    previewBadgeText.textContent = update.content_text;
    
    // Set colors for the preview card badge based on type
    const badgeColors = {
        Feature: { bg: 'var(--color-feature-bg)', border: 'var(--color-feature-border)', text: 'var(--color-feature)' },
        Change: { bg: 'var(--color-change-bg)', border: 'var(--color-change-border)', text: 'var(--color-change)' },
        Breaking: { bg: 'var(--color-breaking-bg)', border: 'var(--color-breaking-border)', text: 'var(--color-breaking)' },
        Deprecated: { bg: 'var(--color-breaking-bg)', border: 'var(--color-breaking-border)', text: 'var(--color-breaking)' },
        Announcement: { bg: 'var(--color-announcement-bg)', border: 'var(--color-announcement-border)', text: 'var(--color-announcement)' },
        Issue: { bg: 'var(--color-issue-bg)', border: 'var(--color-issue-border)', text: 'var(--color-issue)' }
    };
    
    const colors = badgeColors[update.type] || badgeColors.Feature;
    previewBadgeType.style.backgroundColor = colors.bg;
    previewBadgeType.style.borderColor = colors.border;
    previewBadgeType.style.color = colors.text;
    
    // Prepare the tweet text
    // Limit tweet text so that together with overhead and URL, it is within 280 characters.
    // Twitter handles URLs as exactly 23 characters.
    // Template: "📢 BQ [Type] ([Date]): [Text]...\n\nRead more: [Link]"
    const header = `📢 BigQuery ${update.type} (${update.date}):\n`;
    const footer = `\n\nRead more: ${update.link}`;
    
    // Max characters allowed for the text snippet:
    // 280 - (header length) - (footer template overhead length e.g. 12 + 23 chars for URL) - 3 (for ...)
    const overhead = header.length + 12 + 23 + 4; // safe padding
    const maxSnippetLength = 280 - overhead;
    
    let snippet = update.content_text;
    if (snippet.length > maxSnippetLength) {
        // Truncate to maxSnippetLength, then find the last space so we don't truncate mid-word
        let truncated = snippet.substring(0, maxSnippetLength);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > 50) {
            truncated = truncated.substring(0, lastSpace);
        }
        snippet = truncated + '...';
    }
    
    const defaultTweetText = `${header}${snippet}${footer}`;
    
    // Setup textarea
    tweetTextarea.value = defaultTweetText;
    updateTweetCharCount();
    
    // Show Modal
    tweetModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Lock background scrolling
    tweetTextarea.focus();
    
    // Setup post button listener
    postTweetBtn.onclick = () => {
        const text = tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
        closeTweetModal();
        showToast('Shared', 'Redirected to Twitter / X.', 'info');
    };
}

function closeTweetModal() {
    tweetModal.classList.add('hidden');
    document.body.style.overflow = ''; // Unlock background scrolling
}

function updateTweetCharCount() {
    const text = tweetTextarea.value;
    
    // Twitter counts any URL as exactly 23 characters.
    // Let's replace any URLs in the text with a 23-character placeholder to accurately count.
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let countedText = text;
    
    const urls = text.match(urlRegex);
    if (urls) {
        urls.forEach(url => {
            countedText = countedText.replace(url, 'a'.repeat(23));
        });
    }
    
    const count = countedText.length;
    charCount.textContent = count;
    
    // Apply styling alerts
    charCountContainer.className = 'character-count-container';
    postTweetBtn.disabled = false;
    
    if (count > 280) {
        charCountContainer.classList.add('exceeded');
        postTweetBtn.disabled = true;
    } else if (count > 250) {
        charCountContainer.classList.add('warning');
    }
}

/* ==========================================================================
   CLIPBOARD UTILITIES
   ========================================================================== */

function copyUpdateText(updateId) {
    const update = allUpdates.find(up => up.id === updateId);
    if (!update) return;
    
    const fullText = `BigQuery Release Notes - ${update.date} (${update.type})\n${update.content_text}\nSource: ${update.link}`;
    
    navigator.clipboard.writeText(fullText).then(() => {
        showToast('Copied', 'Release note details copied to clipboard.', 'success');
    }).catch(err => {
        console.error('Failed to copy text:', err);
        showToast('Error', 'Could not copy to clipboard.', 'error');
    });
}

/* ==========================================================================
   TOAST NOTIFICATION IMPLEMENTATION
   ========================================================================== */

function showToast(title, message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Choose icon based on type
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="8.01"></line></svg>`;
    }
    
    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" aria-label="Close notification">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Trigger CSS slide-in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Set timeout to remove toast
    const autoCloseTimeout = setTimeout(() => {
        dismissToast(toast);
    }, 4000);
    
    // Close button listener
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(autoCloseTimeout);
        dismissToast(toast);
    });
}

function dismissToast(toast) {
    toast.classList.remove('show');
    // Wait for slide-out animation to finish
    toast.addEventListener('transitionend', () => {
        toast.remove();
    });
}

/* ==========================================================================
   STRING HELPER UTILITIES
   ========================================================================== */

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ==========================================================================
   EXPORT TO CSV UTILITY
   ========================================================================== */

function exportToCSV() {
    if (filteredUpdates.length === 0) {
        showToast('No Data', 'There are no release notes to export.', 'error');
        return;
    }
    
    // CSV headers
    const headers = ['Date', 'Type', 'Content (Text)', 'Link', 'ID'];
    
    // Escaping rule for CSV double quotes and special characters
    const escapeCSVField = (val) => {
        if (val === null || val === undefined) return '';
        let text = String(val).replace(/"/g, '""');
        if (text.includes(',') || text.includes('\n') || text.includes('"') || text.includes('\r')) {
            text = `"${text}"`;
        }
        return text;
    };
    
    const rows = filteredUpdates.map(up => [
        up.date,
        up.type,
        up.content_text,
        up.link,
        up.id
    ]);
    
    const csvContent = [
        headers.map(escapeCSVField).join(','),
        ...rows.map(row => row.map(escapeCSVField).join(','))
    ].join('\r\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // File name uses type filter and current ISO date
    const category = currentFilterType.toLowerCase();
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery_release_notes_${category}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Exported', `Successfully exported ${filteredUpdates.length} updates to CSV.`, 'success');
}
