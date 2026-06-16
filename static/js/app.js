/**
 * BigQuery Release Pulse Client Application Script
 * Vanilla JS ES6+ implementation
 */

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    let releaseNotes = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedNote = null;

    // DOM Elements
    const notesGrid = document.getElementById('notes-grid');
    const refreshBtn = document.getElementById('refresh-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const filterContainer = document.getElementById('category-filters-container');
    const statusMessage = document.getElementById('status-message');
    const lastSyncTime = document.getElementById('last-sync-time');
    const emptyState = document.getElementById('empty-state');
    
    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const submitTweetBtn = document.getElementById('submit-tweet-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const charCountContainer = document.querySelector('.character-count-container');

    // Toast Elements
    const toast = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');

    // SVGs definitions for dynamic injection
    const calendarIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
    `;

    const shareIcon = `
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
    `;

    const externalLinkIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
    `;

    const copyIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    `;

    const checkIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--badge-feature-text);">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    `;

    // Initialize application
    init();

    function init() {
        // Load theme preference
        if (localStorage.getItem('theme') === 'light') {
            document.body.classList.add('light-theme');
        }
        
        fetchReleaseNotes();
        setupEventListeners();
    }

    // Event Listeners setup
    function setupEventListeners() {
        // Refresh Button
        refreshBtn.addEventListener('click', () => {
            fetchReleaseNotes(true);
        });

        // Theme Toggle Button
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            if (document.body.classList.contains('light-theme')) {
                localStorage.setItem('theme', 'light');
                showToast('Switched to Light Theme');
            } else {
                localStorage.setItem('theme', 'dark');
                showToast('Switched to Dark Theme');
            }
        });

        // Export CSV Button
        exportCsvBtn.addEventListener('click', () => {
            const filteredNotes = getFilteredNotes();
            if (filteredNotes.length === 0) {
                showToast('No notes to export.');
                return;
            }
            
            // Build CSV
            let csvContent = "\uFEFF"; // Byte Order Mark for Excel UTF-8 support
            csvContent += "Date,Type,Details,Link\r\n";
            
            filteredNotes.forEach(note => {
                const date = `"${note.date.replace(/"/g, '""')}"`;
                const type = `"${note.type.replace(/"/g, '""')}"`;
                const text = `"${note.text_preview.replace(/"/g, '""')}"`;
                const link = `"${note.link.replace(/"/g, '""')}"`;
                csvContent += `${date},${type},${text},${link}\r\n`;
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            
            const today = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `bigquery_release_notes_${today}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast(`Exported ${filteredNotes.length} updates to CSV.`);
        });

        // Search Input
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            if (searchQuery.length > 0) {
                clearSearchBtn.style.display = 'flex';
            } else {
                clearSearchBtn.style.display = 'none';
            }
            renderNotes();
        });

        // Clear Search Button
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            clearSearchBtn.style.display = 'none';
            renderNotes();
            searchInput.focus();
        });

        // Category Filter badges
        filterContainer.addEventListener('click', (e) => {
            const filterBadge = e.target.closest('.filter-badge');
            if (!filterBadge) return;

            // Remove active from all and add to clicked
            document.querySelectorAll('.filter-badge').forEach(badge => {
                badge.classList.remove('active');
            });
            filterBadge.classList.add('active');

            activeFilter = filterBadge.dataset.filter;
            renderNotes();
        });

        // Modal Event Listeners
        closeModalBtn.addEventListener('click', closeTweetModal);
        cancelTweetBtn.addEventListener('click', closeTweetModal);
        submitTweetBtn.addEventListener('click', postTweet);
        
        // Close modal when clicking outside
        tweetModal.addEventListener('click', (e) => {
            if (e.target === tweetModal) {
                closeTweetModal();
            }
        });

        // Tweet textarea character counting
        tweetTextarea.addEventListener('input', updateCharCount);
    }

    // Toast Notification helper
    function showToast(message, duration = 4000) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        
        // Force reflow
        toast.offsetHeight;
        
        // Clear previous timeout if any
        if (toast.timeoutId) {
            clearTimeout(toast.timeoutId);
        }
        
        toast.timeoutId = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    // Format Timestamp helper
    function formatTime(timestamp) {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // Show skeletons in the grid
    function showSkeletons() {
        notesGrid.innerHTML = `
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        `;
        emptyState.style.display = 'none';
    }

    // Fetch data from Flask API
    function fetchReleaseNotes(forceRefresh = false) {
        showSkeletons();
        
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
        statusMessage.textContent = forceRefresh ? 'Refreshing feed...' : 'Loading release notes...';

        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned code ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    releaseNotes = data.data;
                    lastSyncTime.textContent = `Synced: ${formatTime(data.last_updated)}`;
                    statusMessage.textContent = `Showing ${releaseNotes.length} updates`;
                    
                    if (forceRefresh) {
                        showToast('Release notes successfully refreshed!');
                    }
                    
                    if (data.warning) {
                        showToast(data.warning);
                    }
                } else {
                    throw new Error(data.error || 'Failed to fetch release notes');
                }
            })
            .catch(error => {
                console.error(error);
                statusMessage.textContent = 'Error loading updates';
                showToast(`Error: ${error.message}`);
                
                // If we fail but had loaded notes previously, keep them. Otherwise show empty.
                if (releaseNotes.length === 0) {
                    notesGrid.innerHTML = '';
                    emptyState.style.display = 'block';
                }
            })
            .finally(() => {
                refreshBtn.classList.remove('loading');
                refreshBtn.disabled = false;
                renderNotes();
            });
    }

    // Filter helper function
    function getFilteredNotes() {
        return releaseNotes.filter(note => {
            // Check type filter
            const matchesType = activeFilter === 'all' || 
                note.type.toLowerCase() === activeFilter.toLowerCase();
            
            // Check search text filter
            const matchesSearch = searchQuery === '' || 
                note.type.toLowerCase().includes(searchQuery) ||
                note.date.toLowerCase().includes(searchQuery) ||
                note.text_preview.toLowerCase().includes(searchQuery);
                
            return matchesType && matchesSearch;
        });
    }

    // Filter and Render notes cards
    function renderNotes() {
        const filteredNotes = getFilteredNotes();

        // Update status message
        if (releaseNotes.length > 0) {
            statusMessage.textContent = `Showing ${filteredNotes.length} of ${releaseNotes.length} updates`;
        }

        // Render HTML
        if (filteredNotes.length === 0) {
            notesGrid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        notesGrid.innerHTML = '';

        filteredNotes.forEach((note, index) => {
            const card = document.createElement('article');
            card.className = 'note-card';
            // Stagger animations slightly based on index
            card.style.animationDelay = `${Math.min(index * 50, 600)}ms`;

            // Badge styling class
            const badgeClass = `badge-${note.type.toLowerCase()}`;
            const normalizedBadgeClass = document.querySelector(`.${badgeClass}`) ? badgeClass : 'badge-general';

            card.innerHTML = `
                <div>
                    <div class="card-header">
                        <span class="card-date">
                            ${calendarIcon}
                            ${note.date}
                        </span>
                        <span class="badge ${badgeClass} ${normalizedBadgeClass}">${note.type}</span>
                    </div>
                    <div class="card-body">
                        ${note.content}
                    </div>
                </div>
                <div class="card-footer">
                    <a href="${note.link}" class="card-action-btn source-btn" target="_blank" rel="noopener" aria-label="View original Google Cloud source">
                        ${externalLinkIcon}
                        <span>Source</span>
                    </a>
                    <button class="card-action-btn copy-btn" aria-label="Copy release note text to clipboard">
                        ${copyIcon}
                        <span>Copy</span>
                    </button>
                    <button class="card-action-btn share-btn" aria-label="Tweet this release note">
                        ${shareIcon}
                        <span>Tweet</span>
                    </button>
                </div>
            `;

            // Setup copy handler
            const copyBtn = card.querySelector('.copy-btn');
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(note.text_preview).then(() => {
                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = `
                        ${checkIcon}
                        <span style="color: var(--badge-feature-text); font-weight:700;">Copied!</span>
                    `;
                    showToast('Copied text to clipboard!');
                    setTimeout(() => {
                        copyBtn.innerHTML = originalHTML;
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                    showToast('Failed to copy to clipboard.');
                });
            });

            // Setup share handler for card
            const shareBtn = card.querySelector('.share-btn');
            shareBtn.addEventListener('click', () => {
                openTweetModal(note);
            });

            notesGrid.appendChild(card);
        });
    }

    // Modal Operations
    function openTweetModal(note) {
        selectedNote = note;
        
        // Clean and prepare tweet text
        const hashtag = " #BigQuery #GoogleCloud";
        
        // Build base text
        const prefix = `BigQuery [${note.type}] (${note.date}): `;
        const url = ` ${note.link}`;
        
        // Character lengths
        const availableLength = 280 - prefix.length - hashtag.length - url.length;
        
        let previewText = note.text_preview;
        if (previewText.length > availableLength) {
            // Truncate text nicely at word boundaries if possible
            previewText = previewText.substring(0, availableLength - 3);
            const lastSpace = previewText.lastIndexOf(' ');
            if (lastSpace > availableLength * 0.7) {
                previewText = previewText.substring(0, lastSpace);
            }
            previewText += '...';
        }
        
        const tweetContent = `${prefix}${previewText}${hashtag}${url}`;
        
        tweetTextarea.value = tweetContent;
        updateCharCount();
        
        tweetModal.style.display = 'flex';
        // Add tiny delay for transition
        setTimeout(() => {
            tweetModal.classList.add('active');
            tweetModal.setAttribute('aria-hidden', 'false');
            tweetTextarea.focus();
        }, 10);
    }

    function closeTweetModal() {
        tweetModal.classList.remove('active');
        tweetModal.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
            tweetModal.style.display = 'none';
            selectedNote = null;
        }, 300);
    }

    function updateCharCount() {
        const remaining = 280 - tweetTextarea.value.length;
        charCount.textContent = remaining;
        
        charCountContainer.classList.remove('warning', 'error');
        submitTweetBtn.disabled = false;
        
        if (remaining < 0) {
            charCountContainer.classList.add('error');
            submitTweetBtn.disabled = true;
        } else if (remaining < 30) {
            charCountContainer.classList.add('warning');
        }
    }

    function postTweet() {
        const text = tweetTextarea.value;
        if (text.length > 280) {
            showToast('Tweet content exceeds 280 characters limit!');
            return;
        }
        
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
        
        closeTweetModal();
        showToast('Opened Twitter sharing intent window.');
    }
});
