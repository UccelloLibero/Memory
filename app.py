from flask import Flask, session, render_template, jsonify
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = 'your_secret_key'

def get_reset_time():
    now = datetime.now()
    reset_time = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    return reset_time

@app.route('/')
def index():
    if 'last_play' not in session:
        session['last_play'] = None
    return render_template('index.html', last_play=session['last_play'])

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/end-game', methods=['POST'])
def end_game():
    session['last_play'] = datetime.now().isoformat()
    return '', 204

@app.route('/can-play')
def can_play():
    last_play = session.get('last_play')
    if last_play:
        last_play_time = datetime.fromisoformat(last_play)
        reset_time = get_reset_time()
        if datetime.now() >= reset_time:
            session['last_play'] = None
            return jsonify({'can_play': True})
        return jsonify({'can_play': False, 'last_play': last_play_time.isoformat()})
    return jsonify({'can_play': True})

if __name__ == '__main__':
    app.run(debug=True)