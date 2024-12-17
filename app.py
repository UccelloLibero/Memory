from flask import Flask, render_template, session

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Replace with a secure secret key

@app.route('/')
def index():
    """Renders the landing page."""
    return render_template('index.html')

@app.route('/game')
def game():
    """Renders the game board page."""
    return render_template('game.html')

@app.route('/about')
def about():
    """Renders the about page."""
    return render_template('about.html')

if __name__ == '__main__':
    app.run(debug=True)