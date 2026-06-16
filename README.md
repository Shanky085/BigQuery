# BigQuery Release Pulse

BigQuery Release Pulse is a premium, real-time developer dashboard built with **Python Flask** and **Vanilla JS/CSS** that fetches, parses, filters, and shares release updates from the official Google Cloud BigQuery RSS feed.

---

## 🚀 Key Features

*   **KPI Metrics Dashboard**: View live counts of total updates, new features, changes, breaking updates, and bug fixes.
*   **Instant Client-side Searching**: Search the notes by keywords or date matches instantly.
*   **Filter and Sort Options**: Categorize release cards by update type and sort by newest or oldest.
*   **In-Memory Feed Caching**: Stores feed entries locally for 30 minutes to optimize speed and limit Google Cloud request quotas, falling back gracefully if the network goes offline.
*   **Tweet / X Share Drawer**: Select any release card, customize a pre-formatted message in the composer (with precise character counts handling link shortening), and share it directly on Twitter / X.
*   **Modern Visual Interface**: Built with deep-theme styling, glassmorphism card layouts, CSS grid responsiveness, and toast notification modules.

---

## 🛠️ Technology Stack

*   **Backend**: Python Flask 3.x, BeautifulSoup 4 (HTML Parsing), requests (Network fetches).
*   **Frontend**: Plain HTML5, Vanilla CSS3 (Custom design system), Vanilla JavaScript (ES6).

---

## 📁 File Structure

*   **[app.py](file:///C:/Users/shank/Desktop/agy-cli-projects/app.py)**: The backend server handling routes, XML parsing, caching, and the JSON API.
*   **[templates/index.html](file:///C:/Users/shank/Desktop/agy-cli-projects/templates/index.html)**: Main dashboard page containing layout structures and sharing modal.
*   **[static/css/style.css](file:///C:/Users/shank/Desktop/agy-cli-projects/static/css/style.css)**: Custom dark mode styling and transition animations.
*   **[static/js/app.js](file:///C:/Users/shank/Desktop/agy-cli-projects/static/js/app.js)**: State controller managing metrics calculations, modal dialogs, search queries, and Clipboard/Intent sharing.
*   **[requirements.txt](file:///C:/Users/shank/Desktop/agy-cli-projects/requirements.txt)**: Python dependencies definition.
*   **[.gitignore](file:///C:/Users/shank/Desktop/agy-cli-projects/.gitignore)**: Standard Git patterns ignore list.

---

## ⚙️ Quick Start

### 1. Prerequisites
Make sure Python 3.8+ is installed on your machine.

### 2. Install Dependencies
Navigate to the root directory and install dependencies:
```bash
pip install -r requirements.txt
```

### 3. Run the Server
Launch the Flask development server:
```bash
python app.py
```

### 4. Open Application
Once the server is running, navigate to the following URL in your web browser:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**
