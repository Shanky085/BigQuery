import datetime
import logging
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request
import requests
from bs4 import BeautifulSoup, Tag

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
CACHED_UPDATES = None
LAST_FETCHED = None
CACHE_DURATION = datetime.timedelta(minutes=30)  # Cache for 30 minutes by default

def parse_release_notes(xml_content):
    """
    Parses the BigQuery Release Notes Atom XML content.
    Splits feed entries (which are grouped by date) into individual updates based on <h3> tags.
    """
    root = ET.fromstring(xml_content)
    # Atom namespace
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = root.findall('atom:entry', ns)
    all_updates = []
    
    # Track the order of parsed updates overall
    update_index = 0
    
    for entry in entries:
        date_str = entry.find('atom:title', ns).text
        entry_id = entry.find('atom:id', ns).text
        updated_str = entry.find('atom:updated', ns).text
        
        # Link extraction
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        link = link_elem.attrib.get('href') if link_elem is not None else ""
        
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Parse the HTML content to split into individual updates
        soup = BeautifulSoup(content_html, 'html.parser')
        
        current_update = None
        
        for child in soup.contents:
            if isinstance(child, Tag):
                if child.name == 'h3':
                    # Save the previous update if it exists
                    if current_update:
                        all_updates.append(current_update)
                        update_index += 1
                    
                    update_type = child.text.strip()
                    current_update = {
                        'date': date_str,
                        'id': f"{entry_id}#Update_{update_index}",
                        'type': update_type,
                        'elements': [],
                        'link': link
                    }
                else:
                    if current_update is None:
                        # Fallback if content starts without an h3
                        current_update = {
                            'date': date_str,
                            'id': f"{entry_id}#Update_{update_index}",
                            'type': 'Feature',
                            'elements': [],
                            'link': link
                        }
                    current_update['elements'].append(child)
            elif isinstance(child, str):
                # Text node (ignore whitespace-only, but keep others)
                if child.strip() and current_update:
                    current_update['elements'].append(child)
                    
        if current_update:
            all_updates.append(current_update)
            update_index += 1
            
    # Post-process: Convert elements to HTML string and plain text strings
    processed_updates = []
    for update in all_updates:
        html_parts = []
        text_parts = []
        for el in update['elements']:
            if isinstance(el, Tag):
                html_parts.append(str(el))
                text_parts.append(el.get_text())
            else:
                html_parts.append(str(el))
                text_parts.append(str(el))
                
        processed_updates.append({
            'date': update['date'],
            'id': update['id'],
            'type': update['type'],
            'content_html': ''.join(html_parts).strip(),
            'content_text': ' '.join(text_parts).strip(),
            'link': update['link']
        })
        
    return processed_updates

def fetch_updates(force_refresh=False):
    """
    Fetches and returns the parsed updates, utilizing the in-memory cache if applicable.
    """
    global CACHED_UPDATES, LAST_FETCHED
    
    now = datetime.datetime.now()
    
    # Return cache if valid and refresh not forced
    if not force_refresh and CACHED_UPDATES is not None and LAST_FETCHED is not None:
        if now - LAST_FETCHED < CACHE_DURATION:
            logger.info("Serving updates from cache.")
            return CACHED_UPDATES, LAST_FETCHED, False
            
    logger.info("Fetching fresh updates from BigQuery feed...")
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        updates = parse_release_notes(response.content)
        
        # Update cache
        CACHED_UPDATES = updates
        LAST_FETCHED = now
        return CACHED_UPDATES, LAST_FETCHED, True
    except Exception as e:
        logger.error(f"Error fetching/parsing release notes: {e}")
        # Return cache as fallback if server is down or times out
        if CACHED_UPDATES is not None:
            logger.warning("Using stale cache as fallback due to fetch failure.")
            return CACHED_UPDATES, LAST_FETCHED, False
        raise e

@app.route('/')
def index():
    """Renders the main dashboard page."""
    return render_template('index.html')

@app.route('/api/updates')
def get_updates():
    """
    API endpoint to retrieve updates.
    Supports ?refresh=true query parameter to bypass cache.
    """
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        updates, last_fetched_time, was_refreshed = fetch_updates(force_refresh=force_refresh)
        return jsonify({
            'success': True,
            'updates': updates,
            'last_fetched': last_fetched_time.isoformat(),
            'refreshed_from_source': was_refreshed,
            'count': len(updates)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Running locally
    app.run(debug=True, host='127.0.0.1', port=5000)
