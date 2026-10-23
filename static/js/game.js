document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const progress = document.getElementById('progress');
    const toast = document.getElementById('toast');
    const imagePool = JSON.parse(gameBoard.dataset.images); // Every card image on the server
    const totalPairs = Math.min(6, imagePool.length);
    const bestKey = 'memory-best';
    const sessionKey = 'memory-session';
    const matchPoints = 100;
    const streakBonus = 50; // Extra per match in a row: 2nd +50, 3rd +100, ...
    const slipPenalty = 25; // Only misses the player could have avoided cost points
    const bestVersion = 2; // Bests from before slip scoring aren't comparable
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const partyColours = ['#b6e94a', '#8b5cf6', '#ff6fae', '#4fd8ff', '#facc15'];
    let flippedCards = [];
    let matchedPairs = 0;
    let pairLevels = []; // Score level (1-6) per pair, in the order matched
    let gameEnded = false;
    let moves = 0; // One move = two cards flipped
    let combo = 0; // Matches since the last slip
    let score = 0;
    let slips = 0; // Misses where the player had already seen what they needed
    let explores = 0; // Misses that couldn't have been avoided
    let timer = null;
    let timeElapsed = 0;

    // Star rating by slips, so luck in the shuffle doesn't decide it
    function getStars(slips) {
        if (slips === 0) return 3;
        if (slips <= 2) return 2;
        return 1;
    }

    function formatStars(stars) {
        return '★'.repeat(stars) + '☆'.repeat(3 - stars);
    }

    // A pair's level is how many times its cards were flipped, capped at 6
    function pairLevel(flipCount) {
        return Math.min(Math.max(flipCount, 1), 6);
    }

    // Emoji for a level, used in the shared text
    function levelEmoji(level) {
        return ['🟩', '🟪', '🟦', '🟨', '🟥', '⬛'][level - 1];
    }

    // Personal best: highest score, then fewest moves, then fastest time
    function loadBest() {
        try {
            const best = JSON.parse(localStorage.getItem(bestKey));
            // Ignore bests saved under older scoring rules
            return best && best.v === bestVersion ? best : null;
        } catch {
            return null;
        }
    }

    function saveBest(best) {
        try {
            localStorage.setItem(bestKey, JSON.stringify(best));
        } catch {
            // Storage unavailable (e.g. private mode); best just won't persist
        }
    }

    function isNewBest(best) {
        if (!best || score !== best.score) return !best || score > best.score;
        return moves < best.moves || (moves === best.moves && timeElapsed < best.time);
    }

    // Games played since this tab was opened
    function loadSession() {
        try {
            return JSON.parse(sessionStorage.getItem(sessionKey)) || { games: 0, bestScore: 0, totalScore: 0 };
        } catch {
            return { games: 0, bestScore: 0, totalScore: 0 };
        }
    }

    function recordSessionGame() {
        const stats = loadSession();
        stats.games++;
        stats.totalScore += score;
        stats.bestScore = Math.max(stats.bestScore, score);
        try {
            sessionStorage.setItem(sessionKey, JSON.stringify(stats));
        } catch {
            // Storage unavailable; session stats just won't persist
        }
        return stats;
    }

    function updateStats() {
        document.getElementById('moves').innerText = moves;
        document.getElementById('score').innerText = score;
        const best = loadBest();
        document.getElementById('best').innerText = best ? best.score : '–';
    }

    function bump(element) {
        const pill = element.closest('.pill');
        pill.classList.remove('bump');
        void pill.offsetWidth; // Restart the animation
        pill.classList.add('bump');
    }

    // Fisher-Yates shuffle (returns a new array)
    function shuffle(items) {
        const result = [...items];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    // Pick 6 random images from the pool and deal them as shuffled pairs
    function generateCardImages() {
        const picked = shuffle(imagePool).slice(0, totalPairs);
        return shuffle(picked.flatMap(image => [image, image]));
    }

    // Start the timer
    function startTimer() {
        timer = setInterval(() => {
            timeElapsed++;
            document.getElementById('timer').innerText = formatTime(timeElapsed);
        }, 1000);
    }

    // Stop the timer
    function stopTimer() {
        clearInterval(timer);
        timer = null;
    }

    // Format time as MM:SS
    function formatTime(seconds) {
        const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        return `${minutes}:${secs}`;
    }

    // Initialize the game
    function initializeGame() {
        gameEnded = false;
        flippedCards = [];
        matchedPairs = 0;
        pairLevels = [];
        moves = 0;
        combo = 0;
        score = 0;
        slips = 0;
        explores = 0;
        timeElapsed = 0;

        stopTimer(); // Timer starts on the first flip
        document.getElementById('timer').innerText = formatTime(0);
        updateStats();

        progress.innerHTML = '<span class="progress-dot"></span>'.repeat(totalPairs);

        const cardImages = generateCardImages();
        setupBoard(cardImages);
    }

    // Set up the game board
    function setupBoard(cardImages) {
        gameBoard.innerHTML = ''; // Clear the board

        cardImages.forEach((image, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.dataset.flipCount = '0';
            card.dataset.image = image;
            card.style.setProperty('--i', index); // Staggers the deal animation

            const cardInner = document.createElement('div');
            cardInner.classList.add('card-inner');

            const cardFront = document.createElement('div');
            cardFront.classList.add('card-front');
            cardFront.style.setProperty('--img', `url("${image}")`);

            // The whole photo; edges facing the blurred background are feathered by shape
            const photo = document.createElement('img');
            photo.className = 'card-photo';
            photo.alt = '';
            photo.addEventListener('load', () => {
                const ratio = photo.naturalWidth / photo.naturalHeight;
                if (ratio > 1.02) photo.classList.add('landscape');
                else if (ratio < 0.98) photo.classList.add('portrait');
                // Only non-square photos need the blurred backdrop
                cardFront.classList.toggle('has-backdrop', ratio > 1.02 || ratio < 0.98);
            });
            photo.src = image;
            cardFront.appendChild(photo);

            const cardBack = document.createElement('div');
            cardBack.classList.add('card-back');

            cardInner.appendChild(cardFront);
            cardInner.appendChild(cardBack);
            card.appendChild(cardInner);

            card.addEventListener('click', () => flipCard(card, image));
            gameBoard.appendChild(card);
        });
    }

    // Handle card flip
    function flipCard(card, image) {
        if (flippedCards.length < 2 && !card.classList.contains('flipped') && !gameEnded) {
            if (!timer) startTimer();

            const wasSeen = parseInt(card.dataset.flipCount) > 0;
            card.classList.add('flipped');
            card.dataset.flipCount = parseInt(card.dataset.flipCount) + 1;
            flippedCards.push({ card, image, wasSeen });

            if (flippedCards.length === 2) {
                moves++;
                updateStats();
                bump(document.getElementById('moves'));
                checkMatch();
                if (matchedPairs === totalPairs) {
                    gameEnded = true;
                    score = Math.max(0, score);
                    stopTimer();
                    setTimeout(displayResults, 900);
                }
            }
        }
    }

    // Check for a match
    function checkMatch() {
        const [firstCard, secondCard] = flippedCards;
        if (firstCard.image === secondCard.image) {
            matchedPairs++;
            combo++;
            const points = matchPoints + streakBonus * (combo - 1);
            score += points;
            updateStats();
            bump(document.getElementById('score'));
            // A pair's score is the most times either of its cards was flipped
            const level = pairLevel(Math.max(
                parseInt(firstCard.card.dataset.flipCount),
                parseInt(secondCard.card.dataset.flipCount)
            ));
            pairLevels.push(level);

            const colour = `var(--lvl-${level})`;
            [firstCard.card, secondCard.card].forEach(card => {
                card.style.setProperty('--pair-colour', colour);
                card.classList.add('matched');
                // Wait for the flip to land before bursting
                setTimeout(() => sparkle(card), 350);
            });

            const dot = progress.children[matchedPairs - 1];
            dot.style.background = colour;
            dot.classList.add('filled');

            if (matchedPairs < totalPairs) cheer(level, points);
            flippedCards = [];
        } else {
            if (isSlip(firstCard, secondCard)) {
                slips++;
                combo = 0;
                score -= slipPenalty; // Can dip below zero early on; the final score is floored at 0
                updateStats();
                bump(document.getElementById('score'));
                showToast(`−${slipPenalty} Slip!`, 'slip');
            } else {
                explores++; // Exploring is free and keeps the streak alive
            }
            setTimeout(() => {
                firstCard.card.classList.add('nope');
                secondCard.card.classList.add('nope');
            }, 550);
            setTimeout(() => {
                firstCard.card.classList.remove('flipped', 'nope');
                secondCard.card.classList.remove('flipped', 'nope');
                flippedCards = [];
            }, 1000);
        }
    }

    // A miss is a slip if the first card's match had already been seen,
    // or the second card had been seen before (so it was known not to match)
    function isSlip(firstCard, secondCard) {
        const partnerSeen = [...gameBoard.querySelectorAll('.card')].some(card =>
            card !== firstCard.card &&
            card.dataset.image === firstCard.image &&
            parseInt(card.dataset.flipCount) > 0
        );
        return partnerSeen || secondCard.wasSeen;
    }

    // Pick a message for a match
    function cheer(level, points) {
        let message;
        if (combo >= 2) {
            message = `+${points} Streak ×${combo}!`;
        } else if (level === 1) {
            message = `+${points} ` + ['Lucky!', 'First try!', 'Psychic?'][Math.floor(Math.random() * 3)];
        } else {
            message = `+${points} ` + ['Nice!', 'Got it!', 'Match!', 'Sharp!'][Math.floor(Math.random() * 4)];
        }
        showToast(message);
    }

    function showToast(message, variant = '') {
        toast.innerText = message;
        toast.classList.toggle('toast-slip', variant === 'slip');
        toast.classList.remove('show');
        void toast.offsetWidth; // Restart the animation
        toast.classList.add('show');
    }

    // Burst of little squares out of a card
    function sparkle(card) {
        if (reduceMotion) return;
        for (let i = 0; i < 10; i++) {
            const bit = document.createElement('span');
            bit.className = 'sparkle';
            const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
            const distance = 50 + Math.random() * 40;
            bit.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
            bit.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
            bit.style.setProperty('--c', partyColours[i % partyColours.length]);
            card.appendChild(bit);
            setTimeout(() => bit.remove(), 700);
        }
    }

    // Full-screen confetti for a finished game
    function confetti() {
        if (reduceMotion) return;
        const canvas = document.createElement('canvas');
        canvas.className = 'confetti';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        // Draw at 1x even on Retina: confetti doesn't need the detail, and it's 4x fewer pixels to blend
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        canvas.style.width = `${innerWidth}px`;
        canvas.style.height = `${innerHeight}px`;

        // Two cannons in the bottom corners, firing up and in towards the middle
        const power = Math.sqrt(innerHeight) * 0.95; // Reaches the top third on any screen
        const pieces = Array.from({ length: 200 }, (_, i) => {
            const side = i % 2 === 0 ? 1 : -1; // 1 = left cannon, -1 = right cannon
            return {
                x: side === 1 ? 0 : innerWidth,
                y: innerHeight,
                vx: side * (3 + Math.random() * 9) * Math.min(1, innerWidth / 800 + 0.4),
                vy: -(power * (0.75 + Math.random() * 0.45)),
                size: 6 + Math.random() * 6,
                spin: Math.random() * Math.PI,
                colour: partyColours[Math.floor(Math.random() * partyColours.length)]
            };
        });

        const start = performance.now();
        let last = start;
        function frame(now) {
            // Move by elapsed time (in 60fps frames), so dropped frames don't slow the confetti down
            const step = Math.min((now - last) / (1000 / 60), 3);
            last = now;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let visible = 0;
            for (const p of pieces) {
                p.vy += 0.45 * step;
                p.vx *= Math.pow(0.99, step);
                p.x += p.vx * step;
                p.y += p.vy * step;
                p.spin += 0.2 * step;
                if (p.y > innerHeight + 20 && p.vy > 0) continue; // Fallen off the bottom
                visible++;
                const cos = Math.cos(p.spin), sin = Math.sin(p.spin);
                ctx.setTransform(cos, sin, -sin, cos, p.x, p.y);
                ctx.fillStyle = p.colour;
                ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            }
            // Stop once everything has landed, or after 3.5s at most
            if (visible > 0 && now - start < 3500) {
                requestAnimationFrame(frame);
            } else {
                canvas.remove();
            }
        }
        requestAnimationFrame(frame);
    }

    // Display results
    function displayResults() {
        const stars = getStars(slips);
        const previousBest = loadBest();
        const newBest = isNewBest(previousBest);
        if (newBest) {
            saveBest({ v: bestVersion, score, moves, time: timeElapsed });
            updateStats();
        }
        const sessionStats = recordSessionGame();

        const headline = ['Flawless!', 'Nice work!', 'All pairs found!'][3 - stars];
        const slipLine = `${slips} ${slips === 1 ? 'slip' : 'slips'} · ${explores} exploring`;
        const bestLine = newBest
            ? '🏆 New personal best!'
            : `Best: ${previousBest.score} points`;
        const sessionLine = `This session: ${sessionStats.games} ${sessionStats.games === 1 ? 'game' : 'games'} · top ${sessionStats.bestScore} · avg ${Math.round(sessionStats.totalScore / sessionStats.games)}`;

        const resultsText = [
            `Memory ${formatStars(stars)} ${score} pts`,
            '',
            pairLevels.map(levelEmoji).join('  '),
            '',
            `Slips: ${slips} · Moves: ${moves}`,
            `Time: ${formatTime(timeElapsed)}`
        ].join('\n');

        const overlay = document.createElement('div');
        overlay.className = 'results-overlay';
        overlay.innerHTML = `
            <div class="results-container" role="dialog" aria-label="Results">
                <h2>${headline}</h2>
                <div class="stars" aria-label="${stars} out of 3 stars">
                    ${[0, 1, 2].map(i => `<span class="star ${i < stars ? 'earned' : ''}" style="--i: ${i}">★</span>`).join('')}
                </div>
                <p class="results-score"><strong>${score}</strong> points</p>
                <p class="results-stats">${slipLine}<br>${moves} moves · ${formatTime(timeElapsed)}</p>
                <p class="results-best ${newBest ? 'new' : ''}">${bestLine}</p>
                <p class="results-session">${sessionLine}</p>
                <div class="results-grid">
                    ${pairLevels.map((level, i) => `<span class="swatch lvl-${level}" style="--i: ${i}"></span>`).join('')}
                </div>
                <div class="results-actions">
                    <button id="play-again-button" class="btn btn-primary">Play Again</button>
                    <button id="admire-button" class="btn btn-ghost">Admire your board</button>
                    <button id="share-button" class="btn btn-ghost">Share Results</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        confetti();

        // Floating chip that brings the scorecard back while admiring the board
        const resultsChip = document.createElement('button');
        resultsChip.className = 'results-chip';
        resultsChip.hidden = true;
        resultsChip.innerHTML = `<span class="results-chip-stars">${formatStars(stars)}</span> ${score} pts · <strong>See results</strong>`;
        document.body.appendChild(resultsChip);

        function admireBoard() {
            overlay.hidden = true;
            resultsChip.hidden = false;
            gameBoard.classList.add('admiring');
        }

        function showScorecard() {
            overlay.hidden = false;
            resultsChip.hidden = true;
            gameBoard.classList.remove('admiring');
        }

        function onKeydown(event) {
            if (event.key === 'Escape') {
                overlay.hidden ? showScorecard() : admireBoard();
            }
        }

        document.getElementById('admire-button').addEventListener('click', admireBoard);
        resultsChip.addEventListener('click', showScorecard);
        // Tapping the dimmed backdrop also reveals the board
        overlay.addEventListener('click', event => {
            if (event.target === overlay) admireBoard();
        });
        document.addEventListener('keydown', onKeydown);

        // Share Results Button
        const shareButton = document.getElementById('share-button');
        shareButton.addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({ text: resultsText })
                    .catch(err => console.error('Share failed:', err));
            } else {
                copyResults(resultsText, shareButton);
            }
        });

        // Play Again Button
        document.getElementById('play-again-button').addEventListener('click', () => {
            overlay.remove();
            resultsChip.remove();
            gameBoard.classList.remove('admiring');
            document.removeEventListener('keydown', onKeydown);
            initializeGame();
        });
    }

    // Copy results to clipboard when the share sheet isn't available
    function copyResults(resultsText, button) {
        navigator.clipboard.writeText(resultsText).then(() => {
            button.innerText = 'Copied!';
            setTimeout(() => { button.innerText = 'Share Results'; }, 2000);
        }).catch(() => {
            alert('Unable to copy results.');
        });
    }

    // Start the game
    initializeGame();
});
