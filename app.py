import os

from flask import Flask, render_template, send_from_directory, url_for

app = Flask(__name__)

IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp')


def static_url(filename):
    """URL for a static file, with its modified time appended so browsers fetch fresh copies after edits."""
    path = os.path.join(app.static_folder, filename)
    return url_for('static', filename=filename, v=int(os.path.getmtime(path)))


def card_images():
    """URLs of every card image in static/images; the game deals a random 6 from these."""
    folder = os.path.join(app.static_folder, 'images')
    names = sorted(name for name in os.listdir(folder) if name.lower().endswith(IMAGE_EXTENSIONS))
    return [static_url(f'images/{name}') for name in names]


@app.context_processor
def asset_helpers():
    return {'static_url': static_url}

@app.route('/')
def index():
    """Renders the landing page."""
    return render_template('index.html')

@app.route('/game')
def game():
    """Renders the game board page."""
    return render_template('game.html', card_images=card_images())

@app.route('/favicon.ico')
def favicon():
    """Serves the favicon at the root, where browsers look for it by default."""
    return send_from_directory(os.path.join(app.static_folder, 'favicon'), 'favicon.ico')

@app.route('/about')
def about():
    """Renders the about page."""
    return render_template('about.html')

if __name__ == '__main__':
    # Don't print visitor IP addresses for each request; errors are still shown
    from werkzeug.serving import WSGIRequestHandler
    WSGIRequestHandler.log_request = lambda *args, **kwargs: None
    app.run(debug=True)
