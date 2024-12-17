document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    let flippedCards = [];
    let matchedPairs = 0;
    let gameEnded = false;
    const maxAttempts = 8;
    let attempts = 0;
    let timer;
    let timeElapsed = 0;

    // Function to generate shuffled card images (6 pairs, 12 cards)
    function generateCardImages() {
        const images = [];
        for (let i = 1; i <= 6; i++) {
            const imgPath = `static/images/card${i}.jpg`;
            images.push(imgPath, imgPath);
        }
        return images.sort(() => Math.random() - 0.5); // Shuffle
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
        attempts = 0;
        timeElapsed = 0;

        document.getElementById('timer').innerText = formatTime(0);
        clearInterval(timer);
        startTimer();

        const cardImages = generateCardImages();
        setupBoard(cardImages);
    }

    // Set up the game board
    function setupBoard(cardImages) {
        gameBoard.innerHTML = ''; // Clear any existing content
        gameBoard.style.display = 'grid';
        gameBoard.style.gridTemplateColumns = 'repeat(3, 1fr)'; // 3 cards per row
        gameBoard.style.gap = '10px';
        gameBoard.style.maxWidth = '400px'; // Set a max-width to center the grid
        gameBoard.style.margin = '20px auto';
    
        // Generate and append cards
        cardImages.forEach((image, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
    
            const cardInner = document.createElement('div');
            cardInner.classList.add('card-inner');
            cardInner.style.backgroundImage = `url(${image})`;
            cardInner.style.backgroundSize = 'cover';
            cardInner.style.backgroundPosition = 'center';
            cardInner.style.opacity = '0'; // Hide the front initially
    
            card.appendChild(cardInner);
            card.addEventListener('click', () => flipCard(card, cardInner, image));
            gameBoard.appendChild(card);
        });
    }

    // Create a card element
    function createCard(image) {
        const card = document.createElement('div');
        card.classList.add('card');
        card.style.backgroundColor = '#ffc04c';
        card.style.aspectRatio = '3 / 4';

        const cardInner = document.createElement('div');
        cardInner.classList.add('card-inner');
        cardInner.style.backgroundImage = `url(${image})`;
        cardInner.style.backgroundSize = 'cover';
        cardInner.style.opacity = '0';

        card.appendChild(cardInner);
        card.addEventListener('click', () => flipCard(card, cardInner, image));

        return card;
    }

    // Handle card flip
    function flipCard(card, cardInner, image) {
        if (flippedCards.length < 2 && !card.classList.contains('flipped') && !gameEnded) {
            card.classList.add('flipped');
            cardInner.style.opacity = '1';
            flippedCards.push({ card, cardInner, image });

            if (flippedCards.length === 2) {
                checkMatch();
                attempts++;
                if (matchedPairs === 6 || attempts >= maxAttempts) {
                    gameEnded = true;
                    stopTimer();
                    setTimeout(displayResults, 1000);
                }
            }
        }
    }

    // Check for a match
    function checkMatch() {
        const [firstCard, secondCard] = flippedCards;
        if (firstCard.image === secondCard.image) {
            matchedPairs++;
            flippedCards = [];
        } else {
            setTimeout(() => {
                firstCard.card.classList.remove('flipped');
                secondCard.card.classList.remove('flipped');
                firstCard.card.firstChild.style.opacity = '0';
                secondCard.card.firstChild.style.opacity = '0';
                flippedCards = [];
            }, 1000);
        }
    }

    // Display results
    function displayResults() {
        const results = [];
        document.querySelectorAll('.card').forEach(card => {
            const flipCount = parseInt(card.dataset.flipCount) || 6; // Default 6
            switch (flipCount) {
                case 1: results.push('🟩'); break; // Green
                case 2: results.push('🟪'); break; // Purple
                case 3: results.push('🟦'); break; // Blue
                case 4: results.push('🟨'); break; // Yellow
                case 5: results.push('🟥'); break; // Red
                default: results.push('⬛'); // Black
            }
        });

        const resultsText = `Memory\n\n${results.slice(0, 6).join(' ')}\n${results.slice(6, 12).join(' ')}\nTime: ${formatTime(timeElapsed)}\nAttempts: ${attempts}`;

        gameBoard.innerHTML = `
            <div class="results-container text-center">
                <div class="mb-3">
                    <img src="static/icons/icon1.svg" alt="Dark Memory Chip" style="width: 40px; margin-right: 10px;">
                    <img src="static/icons/icon2.svg" alt="Light Memory Chip" style="width: 40px;">
                </div>
                <h2><strong>Well done!</strong></h2>
                <p>You completed in <strong>${formatTime(timeElapsed)}</strong>.</p>
                <p>Thank you for playing.</p>
                <div class="results-grid" style="display: grid; grid-template-columns: repeat(3, 40px); gap: 10px; justify-content: center; margin: 20px 0;">
                    ${results.slice(0, 12).map(result => `<div style="width: 40px; height: 40px; text-align: center; font-size: 20px;">${result}</div>`).join('')}
                </div>
                <button id="share-button" class="btn btn-warning mb-3" style="width: 200px;">Share Your Results</button>
                <button id="play-again-button" class="btn btn-warning" style="width: 200px;">Play Again</button>
            </div>
        `;

        // Share Results Button
        document.getElementById('share-button').addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: 'Memory',
                    text: resultsText
                }).catch(err => console.error('Share failed:', err));
            } else {
                fallbackCopyResults(resultsText);
            }
        });

        // Play Again Button
        document.getElementById('play-again-button').addEventListener('click', () => {
            initializeGame();
        });
    }

    // Fallback for copying results to clipboard
    function fallbackCopyResults(resultsText) {
        navigator.clipboard.writeText(resultsText).then(() => {
            alert('Results copied to clipboard!');
        }).catch(() => {
            alert('Unable to copy results.');
        });
    }

    // Start the game
    initializeGame();
});