import json
from pathlib import Path
from flask import Flask, request, redirect, url_for, render_template_string, send_from_directory, abort

BASE_DIR = Path(__file__).resolve().parents[1]   # project root
META_FILE = BASE_DIR / "src/_data/gallery-meta.json"
GALLERY_IMAGE_DIR = BASE_DIR / "src/images/gallery"

app = Flask(__name__)

HTML = """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Gallery Metadata Editor</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --bg: #fafafa;
      --card-bg: white;
      --text: #222;
      --muted: #666;
      --border: #ddd;
      --success-bg: #e8f7e8;
      --success-border: #b7dfb7;
      --success-text: #225c22;
      --button-bg: #222;
      --button-text: white;
      --shadow: 0 1px 4px rgba(0,0,0,0.05);
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, sans-serif;
      margin: 2rem;
      background: var(--bg);
      color: var(--text);
    }

    h1 {
      margin: 0 0 0.5rem 0;
      line-height: 1.1;
    }

    .topbar {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .topbar__meta {
      color: var(--muted);
      font-size: 0.95rem;
    }

    .toolbar {
      position: sticky;
      top: 0.75rem;
      z-index: 20;
      margin-bottom: 1.25rem;
    }

    .toolbar__inner {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      background: rgba(250, 250, 250, 0.96);
      backdrop-filter: blur(6px);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 0.75rem 1rem;
      box-shadow: var(--shadow);
    }

    .status-row {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
      min-height: 1.5rem;
    }

    .saved {
      background: var(--success-bg);
      border: 1px solid var(--success-border);
      color: var(--success-text);
      padding: 0.55rem 0.8rem;
      border-radius: 10px;
      font-size: 0.95rem;
    }

    .draft-status {
      color: var(--muted);
      font-size: 0.95rem;
    }

    .button-row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    button {
      border: 0;
      background: var(--button-bg);
      color: var(--button-text);
      padding: 0.7rem 1rem;
      border-radius: 10px;
      cursor: pointer;
      font: inherit;
    }

    button.secondary {
      background: #666;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 1.5rem;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem;
      box-shadow: var(--shadow);
    }

    .preview {
      width: 100%;
      height: 260px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f2f2f2;
      border-radius: 8px;
      margin-bottom: 1rem;
      overflow: hidden;
    }

    .preview img {
      display: block;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .missing {
      color: #888;
      font-size: 0.95rem;
    }

    .filename {
      font-size: 0.95rem;
      color: var(--muted);
      word-break: break-all;
      margin-bottom: 0.75rem;
    }

    label {
      display: block;
      font-size: 0.95rem;
      font-weight: 600;
      margin-top: 0.75rem;
      margin-bottom: 0.3rem;
    }

    input, textarea {
      width: 100%;
      padding: 0.65rem;
      border: 1px solid #ccc;
      border-radius: 8px;
      font: inherit;
      background: white;
    }

    textarea {
      min-height: 100px;
      resize: vertical;
    }

    .card.is-dirty {
      border-color: #c6a700;
      box-shadow: 0 0 0 2px rgba(198, 167, 0, 0.08), var(--shadow);
    }

    .card__meta {
      margin-top: 0.65rem;
      color: var(--muted);
      font-size: 0.85rem;
    }

    @media (max-width: 600px) {
      body {
        margin: 1rem;
      }

      .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div>
      <h1>Gallery Metadata Editor</h1>
      <div class="topbar__meta">
        Editing <code>{{ meta_file }}</code>
      </div>
    </div>
  </div>

  <form method="post" action="{{ url_for('save_all') }}" id="gallery-form">
    <div class="toolbar">
      <div class="toolbar__inner">
        <div class="status-row">
          {% if saved %}
            <div class="saved">Saved to JSON.</div>
          {% endif %}
          <div class="draft-status" id="draft-status">Draft changes are autosaved in this browser.</div>
        </div>

        <div class="button-row">
          <button type="submit">Save All</button>
          <button type="button" class="secondary" id="clear-drafts">Clear Local Drafts</button>
        </div>
      </div>
    </div>

    <div class="grid">
      {% for item in items %}
        <div class="card" data-filename="{{ item.filename }}">
          <div class="preview">
            {% if item.exists %}
              <img src="{{ item.image_url }}" alt="{{ item.caption }}">
            {% else %}
              <div class="missing">Image not found</div>
            {% endif %}
          </div>

          <div class="filename">{{ item.filename }}</div>

          <label for="date__{{ loop.index0 }}">Date</label>
          <input
            id="date__{{ loop.index0 }}"
            type="text"
            name="date__{{ item.filename }}"
            value="{{ item.date }}"
            placeholder="YYYY-MM-DD"
            data-field="date"
            data-filename="{{ item.filename }}"
          >

          <label for="caption__{{ loop.index0 }}">Caption</label>
          <textarea
            id="caption__{{ loop.index0 }}"
            name="caption__{{ item.filename }}"
            data-field="caption"
            data-filename="{{ item.filename }}"
          >{{ item.caption }}</textarea>

          <label for="location__{{ loop.index0 }}">Location</label>
          <input
            id="location__{{ loop.index0 }}"
            type="text"
            name="location__{{ item.filename }}"
            value="{{ item.location }}"
            data-field="location"
            data-filename="{{ item.filename }}"
          >

          <label for="tags__{{ loop.index0 }}">Tags (comma-separated)</label>
          <input
            id="tags__{{ loop.index0 }}"
            type="text"
            name="tags__{{ item.filename }}"
            value="{{ item.tags|join(', ') }}"
            data-field="tags"
            data-filename="{{ item.filename }}"
          >

          <div class="card__meta">Unsaved edits in this browser are restored automatically.</div>
        </div>
      {% endfor %}
    </div>
  </form>

  <script>
    const STORAGE_KEY = "gallery-metadata-editor-drafts-v1";
    const form = document.getElementById("gallery-form");
    const draftStatus = document.getElementById("draft-status");
    const clearDraftsButton = document.getElementById("clear-drafts");
    const fields = Array.from(document.querySelectorAll("[data-filename][data-field]"));

    function loadDrafts() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch (err) {
        console.error("Could not parse local drafts:", err);
        return {};
      }
    }

    function saveDrafts(drafts) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    }

    function markDirtyCard(field, isDirty) {
      const card = field.closest(".card");
      if (!card) return;
      card.classList.toggle("is-dirty", isDirty);
    }

    function setStatus(message) {
      draftStatus.textContent = message;
    }

    function getServerValue(field) {
      return field.defaultValue ?? "";
    }

    function getCurrentValue(field) {
      return field.value ?? "";
    }

    function buildDraftKey(field) {
      return `${field.dataset.filename}::${field.dataset.field}`;
    }

    function applyDraftsToForm() {
      const drafts = loadDrafts();
      let restoredCount = 0;

      fields.forEach((field) => {
        const key = buildDraftKey(field);
        if (Object.prototype.hasOwnProperty.call(drafts, key)) {
          field.value = drafts[key];
          restoredCount += 1;
        }
        markDirtyCard(field, getCurrentValue(field) !== getServerValue(field));
      });

      if (restoredCount > 0) {
        setStatus(`Restored ${restoredCount} unsaved field${restoredCount === 1 ? "" : "s"} from local drafts.`);
      } else {
        setStatus("Draft changes are autosaved in this browser.");
      }
    }

    function updateDraftForField(field) {
      const drafts = loadDrafts();
      const key = buildDraftKey(field);
      const currentValue = getCurrentValue(field);
      const serverValue = getServerValue(field);

      if (currentValue === serverValue) {
        delete drafts[key];
        markDirtyCard(field, false);
      } else {
        drafts[key] = currentValue;
        markDirtyCard(field, true);
      }

      saveDrafts(drafts);

      const draftCount = Object.keys(drafts).length;
      if (draftCount > 0) {
        setStatus(`Autosaved ${draftCount} unsaved field${draftCount === 1 ? "" : "s"} in this browser.`);
      } else {
        setStatus("All current edits match the saved JSON.");
      }
    }

    function clearDrafts() {
      localStorage.removeItem(STORAGE_KEY);
      fields.forEach((field) => {
        field.value = getServerValue(field);
        markDirtyCard(field, false);
      });
      setStatus("Cleared local drafts and restored the last saved JSON values.");
    }

    fields.forEach((field) => {
      field.addEventListener("input", () => updateDraftForField(field));
      field.addEventListener("change", () => updateDraftForField(field));
    });

    clearDraftsButton.addEventListener("click", clearDrafts);

    form.addEventListener("submit", () => {
      // Let the server save first; clear drafts now so saved values don't get reapplied on reload.
      localStorage.removeItem(STORAGE_KEY);
      setStatus("Saving all changes...");
    });

    applyDraftsToForm();
  </script>
</body>
</html>
"""


def load_meta():
    with META_FILE.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, dict):
        raise ValueError("gallery-meta.json must be an object keyed by filename.")

    return data


def save_meta(data):
    with META_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


@app.route("/gallery-image/<path:filename>")
def gallery_image(filename):
    file_path = GALLERY_IMAGE_DIR / filename
    if not file_path.exists():
        abort(404)
    return send_from_directory(str(GALLERY_IMAGE_DIR), filename)


@app.route("/")
def index():
    data = load_meta()
    saved = request.args.get("saved") == "1"

    items = []
    for filename, meta in data.items():
        file_path = GALLERY_IMAGE_DIR / filename
        items.append({
            "filename": filename,
            "image_url": url_for("gallery_image", filename=filename),
            "exists": file_path.exists(),
            "caption": meta.get("caption", ""),
            "location": meta.get("location", ""),
            "tags": meta.get("tags", []),
            "date": meta.get("date", ""),
        })

    return render_template_string(
        HTML,
        items=items,
        saved=saved,
        meta_file=str(META_FILE),
    )


@app.route("/save-all", methods=["POST"])
def save_all():
    data = load_meta()

    for filename in data.keys():
        date_val = request.form.get(f"date__{filename}", "").strip()
        caption_val = request.form.get(f"caption__{filename}", "").strip()
        location_val = request.form.get(f"location__{filename}", "").strip()
        tags_raw = request.form.get(f"tags__{filename}", "").strip()

        tags = [t.strip() for t in tags_raw.split(",") if t.strip()]

        data[filename]["date"] = date_val
        data[filename]["caption"] = caption_val
        data[filename]["location"] = location_val
        data[filename]["tags"] = tags

    save_meta(data)
    return redirect(url_for("index", saved="1"))


if __name__ == "__main__":
    if not META_FILE.exists():
        raise FileNotFoundError(f"Could not find {META_FILE}")
    if not GALLERY_IMAGE_DIR.exists():
        raise FileNotFoundError(f"Could not find image directory: {GALLERY_IMAGE_DIR}")

    print(f"Using metadata file: {META_FILE}")
    print(f"Using gallery image directory: {GALLERY_IMAGE_DIR}")

    app.run(debug=True, port=5001)