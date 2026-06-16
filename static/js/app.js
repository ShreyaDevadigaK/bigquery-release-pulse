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

    // Initialize application
    init();

    function init() {
        fetchReleaseNotes();
        setupEventListeners();
    }

    // Event Listeners setup
    function setupEventListeners() {
        // Refresh Button
        refreshBtn.addEventListener('click', () => {
            fetchReleaseNotes(true);
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
        
        setTimeout(() => {
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

    // Filter and Render notes cards
    function renderNotes() {
        // Filter elements
        const filteredNotes = releaseNotes.filter(note => {
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
                    <button class="card-action-btn share-btn" aria-label="Tweet this release note">
                        ${shareIcon}
                        <span>Tweet</span>
                    </button>
                </div>
            `;

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
        // E.g., "BigQuery Update (June 15, 2026): Use Gemini Cloud Assist to analyze SQL queries... #BigQuery #GoogleCloud https://..."
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
