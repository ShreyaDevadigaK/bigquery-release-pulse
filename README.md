# 🌟 BigQuery Release Pulse

A sleek, ambient dark-themed dashboard designed to fetch, parse, search, filter, and share Google BigQuery release notes. Built with **Python Flask** on the backend and modern **vanilla HTML5, CSS3, and JavaScript** on the frontend.

---

## 🚀 Key Features

*   **Smart RSS/Atom Parsing**: Uses `BeautifulSoup` and `feedparser` to extract individual release items (Features, Changes, Fixes, Issues, Deprecated) from Google's day-grouped XML feed and display them as separate cards.
*   **In-Memory Caching**: Implements a 5-minute server cache to prevent rate-limiting and accelerate load times.
*   **Forced Refresh & Fallback**: Clicking the refresh button fetches a live feed. If the connection fails, it gracefully falls back to the cache and alerts the user with a toast.
*   **Light & Dark Theme Toggle**: Easily swap between a futuristic dark theme and a clean light-slate theme. Preferences persist across page loads using `localStorage`.
*   **Copy to Clipboard**: Copies plain-text release summaries directly to your clipboard with a single click, featuring dynamic "Copied!" checkmark animations on the card.
*   **Export to CSV**: Dynamically packages your *currently filtered and searched* release notes into a standard Excel-compatible CSV file for offline reporting.
*   **Character-Aware Sharing**: Opens a custom share modal for X (formerly Twitter) that automatically truncates updates at word boundaries to fit the 280-character limit, complete with a color-coded counter.

---

## 🛠️ Technology Stack

*   **Backend**: Python 3.13, Flask, Requests, Feedparser, BeautifulSoup4
*   **Frontend**: Vanilla HTML5, CSS3 (CSS Variables, Flexbox, Grid), Vanilla ES6+ JavaScript
*   **Integrations**: Twitter Web Intent API

---

## 📂 Project Structure

```
bigquery-release-notes/
├── app.py                  # Flask backend (caching, parsing, and API routes)
├── templates/
│   └── index.html          # Dashboard page template
├── static/
│   ├── css/
│   │   └── style.css       # Layouts, tokens, glassmorphism, & animations
│   └── js/
│       └── app.js          # AJAX fetch, reactive search/filters, & modals
├── .gitignore              # Ignores venv, caches, and IDE structures
└── README.md               # Project documentation
```

---

## 💻 Installation & Local Execution

### Prerequisites
Make sure you have **Python 3.8+** installed.

### Setup Instructions

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/ShreyaDevadigaK/bigquery-release-pulse.git
    cd bigquery-release-pulse
    ```

2.  **Create and activate a Virtual Environment**:
    - **Windows (PowerShell)**:
      ```powershell
      python -m venv venv
      .\venv\Scripts\Activate.ps1
      ```
    - **macOS / Linux**:
      ```bash
      python3 -m venv venv
      source venv/bin/activate
      ```

3.  **Install dependencies**:
    ```bash
    pip install Flask requests feedparser beautifulsoup4
    ```

4.  **Run the Flask application**:
    ```bash
    python app.py
    ```

5.  **Access the Dashboard**:
    Open your web browser and go to **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 📖 How It Works Under the Hood

### 1. Granular Release Card Separation
Google's release feed organizes entries by date (e.g. all updates on "June 15, 2026" inside one entry). The backend parses the HTML of each entry:
```python
soup = BeautifulSoup(summary_html, "html.parser")
h3_tags = soup.find_all("h3")
```
It splits the content by `<h3>` headers so that a single day's updates are individual cards that can be categorized and searched.

### 2. Auto-Truncating Twitter Composer
The frontend measures the length of the release note and calculates remaining characters taking prefix tags and hashtags into account:
```javascript
const hashtag = " #BigQuery #GoogleCloud";
const prefix = `BigQuery [${note.type}] (${note.date}): `;
const url = ` ${note.link}`;
const availableLength = 280 - prefix.length - hashtag.length - url.length;
```
If the text exceeds `availableLength`, the script truncates the string at the nearest word boundary and appends `...` to keep the tweet within the 280-character limit.

---

## 📄 License
This project is open-source and available under the MIT License.
