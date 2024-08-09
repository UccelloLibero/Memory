document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    let flippedCards = [];
    let matchedPairs = 0;
    let gameEnded = false;
    const maxAttempts = 8;
    let attempts = 0;

    // Function to generate card images
    function generateCardImages(numPairs) {
        const images = [];
        for (let i = 1; i <= numPairs; i++) {
            const imgPath = `static/images/card${i}.jpg`; 
            images.push(imgPath, imgPath);
        }
        return images.sort(() => 0.5 - Math.random()); // Randomize the order of images
    }

    // Fetch request to check if the user can play the game
    fetch('/can-play')
        .then(response => response.json())
        .then(data => {
            if (!data.can_play) {
                document.getElementById('last-play-time').innerText = `You last played on: ${new Date(data.last_play).toLocaleString()}`;
                alert('You have already played today. Come back tomorrow!');
                return;
            }

            // Initialize game if the user can play
            initializeGame();
        });

    // Function to initialize the game
    function initializeGame() {
        const cardImages = generateCardImages(4); // Generate images for 4 pairs
        setupBoard(cardImages); // Set up the game board with cards
    }

    // Function to set up the game board with cards
    function setupBoard(cardImages) {
        gameBoard.innerHTML = '';
        const row = document.createElement('div');
        row.classList.add('row', 'justify-content-center'); // Create a row to center the cards

        cardImages.forEach(image => {
            const cardCol = document.createElement('div');
            cardCol.classList.add('col-6', 'col-md-3', 'mb-4', 'd-flex', 'justify-content-center'); // 2 cards per row on small screens, 4 cards per row on medium and larger screens

            const card = createCard(image);
            cardCol.appendChild(card);
            row.appendChild(cardCol); // Append the card column to the row
        });

        gameBoard.appendChild(row); // Append the row to the game board
    }

    // Function to create a card element
    function createCard(image) {
        const card = document.createElement('div');
        card.classList.add('card');

        const cardInner = document.createElement('div');
        cardInner.classList.add('card-inner');

        const cardFront = document.createElement('div');
        cardFront.classList.add('card-front');
        cardFront.style.backgroundImage = `url(${image})`; // Set the image as the background

        const cardBack = document.createElement('div');
        cardBack.classList.add('card-back');
        cardBack.innerText = 'Memory'; // Add text or image for the card back 

        cardInner.appendChild(cardFront);
        cardInner.appendChild(cardBack);
        card.appendChild(cardInner);

        card.addEventListener('click', () => flipCard(card, image)); // Add click event to flip the card

        return card; // Return the created card element
    }

    // Function to flip a card
    function flipCard(card, image) {
        if (flippedCards.length < 2 && !card.classList.contains('flipped') && !gameEnded) {
            card.classList.add('flipped');
            
            // Track the number of flips
            if (!card.dataset.flipCount) {
                card.dataset.flipCount = 1;
            } else {
                card.dataset.flipCount = parseInt(card.dataset.flipCount) + 1;
            }

            flippedCards.push({ card, image }); // Add flipped card to the list

            if (flippedCards.length === 2) {
                checkMatch(); // Check for a match if two cards are flipped
                attempts++;
                if (matchedPairs === 4 || attempts >= maxAttempts) { // 4 pairs for 8 cards or max attempts reached
                    gameEnded = true;
                    setTimeout(flipAllCards, 1000); // Flip all cards before displaying results
                }
            }
        }
    }

    // Function to check if flipped cards match
    function checkMatch() {
        const [firstCard, secondCard] = flippedCards;

        if (firstCard.image === secondCard.image) {
            matchedPairs++; // Increase matched pairs count
            flippedCards = []; // Reset flipped cards list
        } else {
            setTimeout(() => {
                firstCard.card.classList.remove('flipped');
                secondCard.card.classList.remove('flipped');
                flippedCards = []; // Reset flipped cards list after delay
            }, 1000);
        }
    }

    // Function to flip all cards before displaying results
    function flipAllCards() {
        document.querySelectorAll('.card').forEach(card => {
            card.classList.add('flipped');
        });
        setTimeout(displayResults, 1000); // Wait for the flip animation before displaying results
    }

    // Function to display game results
    function displayResults() {
        const results = [];
        document.querySelectorAll('.card').forEach(card => {
            if (card.classList.contains('flipped')) {
                const flipCount = parseInt(card.dataset.flipCount);
                switch (flipCount) {
                    case 1:
                        results.push('🟩'); // Green square for first flip
                        break;
                    case 2:
                        results.push('🟪'); // Purple square for second flip
                        break;
                    case 3:
                        results.push('🟦'); // Blue square for third flip
                        break;
                    case 4:
                        results.push('🟨'); // Yellow square for fourth flip
                        break;
                    case 5:
                        results.push('🟥'); // Red square for fifth flip
                        break;
                    default:
                        results.push('⬛'); // Black square for more than five flips
                }
            } else {
                results.push('⬛'); // Black square for unmatched
            }
        });

        const resultsText = `Memory\n\n${results.slice(0, 4).join(' ')}\n\n${results.slice(4, 8).join(' ')}\n`;

        const now = new Date();
        const nextRoundTime = new Date(now);
        nextRoundTime.setHours(24, 0, 0, 0); // Set next round to midnight
        const timeUntilNextRound = nextRoundTime - now;

        // Displaying results to the player
        gameBoard.innerHTML = `
            <div class="results-container text-center">
                <h1>Well done!</h1>
                <h2>Greek Alphabet</h2>
                <div class="results">${results.slice(0, 4).join(' ')}<br>${results.slice(4, 8).join(' ')}</div>
                <p>Nice job!</p>
                <h3>Next round in:</h3>
                <div id="countdown-timer"></div>
                <button id="share-button" class="btn btn-success mt-3" style="width: 200px; border: none;">Share your results</button>
                <button id="another-game-button" class="btn btn-primary mt-3" style="width: 200px; background-color: #B030F8; border: none;">Play Flagship</button>
            </div>
        `;

        addShareButton(resultsText); // Add share button functionality
        startCountdown(timeUntilNextRound); // Start countdown timer

        document.getElementById('another-game-button').addEventListener('click', () => {
            window.location.href = 'https://flagship.mcpherson.io'; // Replace with the actual URL of the other game
        });
    }

    // Function to start the countdown timer
    function startCountdown(duration) {
        const timer = document.getElementById('countdown-timer');
        let time = duration;

        const updateCountdown = () => {
            const hours = Math.floor(time / (1000 * 60 * 60));
            const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((time % (1000 * 60)) / 1000);

            timer.innerText = `${hours}h ${minutes}m ${seconds}s`;

            if (time > 0) {
                time -= 1000;
            } else {
                clearInterval(countdownInterval);
                timer.innerText = '00h 00m 00s';
            }
        };

        updateCountdown();
        const countdownInterval = setInterval(updateCountdown, 1000); // Update timer every second
    }

    // Function to copy results to clipboard or share via Web Share API
    function copyResults(resultsText) {
        isSafariPrivateBrowsing().then((isPrivate) => {
            if (isPrivate) {
                alert('Safari private browsing detected. Copy the text manually.');
                fallbackManualCopy(resultsText); // Fallback for manual copy
            } else if (navigator.share) {
                var shareData = {
                    title: 'Memory',
                    text: resultsText,
                };
                navigator.share(shareData).then(() => {
                    alert('Results shared successfully!');
                }).catch((error) => {
                    console.error('Error sharing:', error);
                    fallbackCopyResults(resultsText); // Fallback to copy to clipboard if sharing fails
                });
            } else {
                fallbackCopyResults(resultsText); // Fallback if Web Share API is not supported
            }
        });
    }

    // Fallback function to copy results to clipboard
    function fallbackCopyResults(resultsText) {
        navigator.clipboard.writeText(resultsText).then(() => {
            alert('Results copied to clipboard!');
        }, () => {
            alert('Failed to copy results.');
        });
    }

    // Fallback function for manual copy to support share results in Safari
    function fallbackManualCopy(resultsText) {
        var tempInput = document.createElement("textarea");
        tempInput.value = resultsText;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        alert('Results copied to clipboard! You can now paste them.');
    }

    // Function to detect Safari private browsing
    function isSafariPrivateBrowsing() {
        return new Promise(function (resolve) {
            var testLocalStorage = function () {
                try {
                    if (window.localStorage) {
                        localStorage.setItem('test', '1');
                        localStorage.removeItem('test');
                        resolve(false);
                    }
                } catch (e) {
                    resolve(true);
                }
            };

            var testIndexedDB = function () {
                var db;
                var tryIndexedDB = indexedDB.open('test');
                tryIndexedDB.onerror = function () {
                    resolve(true); // IndexedDB is not available, likely private browsing
                };
                tryIndexedDB.onsuccess = function () {
                    db = tryIndexedDB.result;
                    resolve(false); // IndexedDB is available, not in private browsing
                };
            };

            // Safari Private Browsing detects both localStorage and IndexedDB
            testLocalStorage();
            testIndexedDB();
        });
    }

    // Function to add share button functionality
    function addShareButton(resultsText) {
        const shareButton = document.getElementById('share-button');
        shareButton.addEventListener('click', () => {
            copyResults(resultsText);
        });
    }
});