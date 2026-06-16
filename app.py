import os
import re
import time
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Simple in-memory cache
cache = {
    "data": None,
    "last_updated": 0
}
CACHE_DURATION = 300  # 5 minutes in seconds
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Parse with feedparser
        feed = feedparser.parse(response.content)
        
        updates = []
        for entry in feed.entries:
            date_str = entry.get("title", "")
            iso_date = entry.get("updated", "")
            link = entry.get("link", "")
            summary_html = entry.get("summary", "")
            
            if not summary_html:
                continue
                
            soup = BeautifulSoup(summary_html, "html.parser")
            h3_tags = soup.find_all("h3")
            
            if not h3_tags:
                # Fallback: treat entire summary as one update
                text_preview = soup.get_text().strip()
                updates.append({
                    "id": f"gen_{hash(link)}_{len(updates)}",
                    "date": date_str,
                    "iso_date": iso_date,
                    "type": "General",
                    "content": summary_html,
                    "link": link,
                    "text_preview": text_preview
                })
                continue
                
            for i, h3 in enumerate(h3_tags):
                update_type = h3.get_text().strip()
                
                # Collect siblings until next h3
                content_parts = []
                sibling = h3.next_sibling
                while sibling and sibling.name != "h3":
                    content_parts.append(str(sibling))
                    sibling = sibling.next_sibling
                    
                content_html = "".join(content_parts).strip()
                content_soup = BeautifulSoup(content_html, "html.parser")
                text_preview = content_soup.get_text().strip()
                
                # Clean up whitespace and newlines
                text_preview = re.sub(r'\s+', ' ', text_preview)
                
                # Format a anchor link for the release note
                anchor = date_str.replace(" ", "_").replace(",", "")
                update_link = f"https://docs.cloud.google.com/bigquery/docs/release-notes#{anchor}"
                
                updates.append({
                    "id": f"{anchor}_{i}",
                    "date": date_str,
                    "iso_date": iso_date,
                    "type": update_type,
                    "content": content_html,
                    "link": update_link,
                    "text_preview": text_preview
                })
                
        return updates, None
    except Exception as e:
        return None, str(e)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/release-notes")
def get_release_notes():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    current_time = time.time()
    
    # Check if cache is valid and refresh is not forced
    if cache["data"] is not None and not force_refresh and (current_time - cache["last_updated"] < CACHE_DURATION):
        return jsonify({
            "success": True,
            "source": "cache",
            "last_updated": cache["last_updated"],
            "data": cache["data"]
        })
        
    # Otherwise fetch fresh data
    data, error = fetch_and_parse_feed()
    if error:
        # If fetch fails but we have cached data, return cache as fallback
        if cache["data"] is not None:
            return jsonify({
                "success": True,
                "source": "cache_fallback",
                "last_updated": cache["last_updated"],
                "data": cache["data"],
                "warning": f"Could not refresh: {error}. Serving cached data."
            })
        return jsonify({
            "success": False,
            "error": error
        }), 500
        
    cache["data"] = data
    cache["last_updated"] = current_time
    
    return jsonify({
        "success": True,
        "source": "network",
        "last_updated": current_time,
        "data": data
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
