// game.js - Core game engine

// Game state
let gameState = {
    year: 1890,
    month: 8,
    visitedEvents: new Set(),
    stats: {
        members: 100000,
        seats: 35,
        funds: 20,
        budget: 27,
        zc_relation: 0,
        fvp_relation: 0,
        reformist_strength: 0
    }
};

// Event data storage
let events = {};
let currentEvent = null;

// Initialize game
function initializeGame() {
    console.log("Initializing game...");
    
    // Update UI with initial state
    updateGameUI();
    
    // Load and display the initial event
    loadInitialEvent();
    
    // Check for initial events from YAML files (optional)
    // checkEvents();
}

// Function to load and display your event
function loadInitialEvent() {
    // Replace placeholder content with your event
    document.getElementById('event-title').textContent = "The August Days";
    document.getElementById('event-date').textContent = getDateDisplay();
    
    // Update event content
    const contentDiv = document.getElementById('event-content');
    contentDiv.innerHTML = `
        <p><strong>"Hello there!"</strong></p>
        <p><strong>"I hope this will work"</strong></p>
    `;
    
    // Hide the placeholder
    const placeholder = document.querySelector('.choice-placeholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    
    // Create choice buttons
    const choicesDiv = document.getElementById('event-choices');
    
    // Clear any existing choice buttons
    const oldButtons = choicesDiv.querySelectorAll('.choice-btn');
    oldButtons.forEach(btn => btn.remove());
    
    // Add first choice button
    const choice1 = document.createElement('button');
    choice1.className = 'choice-btn';
    choice1.textContent = "We seek closer collaboration with friendly parties in the Reichstag.";
    choice1.onclick = function() {
        selectChoice('thank');
    };
    choicesDiv.appendChild(choice1);
    
    // Add second choice button
    const choice2 = document.createElement('button');
    choice2.className = 'choice-btn';
    choice2.textContent = "We host a few parades across the country.";
    choice2.onclick = function() {
        selectChoice('celebrate');
    };
    choicesDiv.appendChild(choice2);
}

// Handle choice selection
function selectChoice(choiceId) {
    console.log("Choice selected:", choiceId);
    
    // Apply effects based on choice
    if (choiceId === 'thank') {
        // Apply thank choice effects
        gameState.stats.zc_relation += 2;
        gameState.stats.fvp_relation += 5;
        gameState.stats.reformist_strength += 3;
        gameState.month += 1;
        console.log("Effects applied: +2 zc_relation, +5 fvp_relation, +3 reformist_strength, +1 month");
    } else if (choiceId === 'celebrate') {
        // Apply celebrate choice effects
        gameState.month += 1;
        console.log("Effects applied: +1 month");
    }
    
    // Update UI
    updateGameUI();
    
    // Advance time and load next event
    setTimeout(() => {
        loadNextEvent();
    }, 500);
}
    
    const choice2 = document.createElement('button');
    choice2.className = 'choice-btn';
    choice2.textContent = "Expand party press";
    choice2.onclick = function() {
        alert("Party press expansion selected!");
        advanceTime();
    };
    choicesDiv.appendChild(choice2);
}

// Advance time by one month
function advanceTime() {
    gameState.month += 1;
    
    if (gameState.month > 12) {
        gameState.month = 1;
        gameState.year += 1;
    }
    
    updateGameUI();
}

// Update all UI elements
function updateGameUI() {
    // Update date display
    document.getElementById('current-date').textContent = getDateDisplay();
    
    // Update stats
    document.getElementById('stat-members').textContent = gameState.stats.members.toLocaleString();
    document.getElementById('stat-seats').textContent = gameState.stats.seats;
    document.getElementById('stat-funds').textContent = gameState.stats.funds;
    document.getElementById('stat-budget').textContent = gameState.stats.budget;
    
    // Update progress bar if function exists
    if (typeof updateYearProgress === 'function') {
        updateYearProgress(gameState.year);
    }
}

// Get formatted date display
function getDateDisplay() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[gameState.month - 1]} ${gameState.year}`;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, setting up game...");
    
    // Connect the "Advance Time" button
    const nextTurnBtn = document.getElementById('next-turn-btn');
    if (nextTurnBtn) {
        nextTurnBtn.addEventListener('click', function() {
            advanceTime();
            // Optionally load a new event after advancing
            setTimeout(loadNextEvent, 300);
        });
    }
    
    // Initialize the game
    initializeGame();
    
    // Setup tab switching (from your HTML)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Update active button
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show selected tab
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.getElementById('tab-' + tabName).classList.add('active');
        });
    });
    
    // Setup map toggle button
    const toggleMapBtn = document.getElementById('toggle-map-btn');
    if (toggleMapBtn) {
        toggleMapBtn.addEventListener('click', function() {
            const eventContainer = document.getElementById('event-container');
            const mapContainer = document.getElementById('map-container');
            
            if (eventContainer.style.display !== 'none') {
                // Switch to map view
                eventContainer.style.display = 'none';
                mapContainer.style.display = 'block';
                this.innerHTML = '<i class="fas fa-scroll"></i> Events';
                this.title = 'Switch back to events view';
            } else {
                // Switch to event view
                eventContainer.style.display = 'block';
                mapContainer.style.display = 'none';
                this.innerHTML = '<i class="fas fa-map"></i> Map';
                this.title = 'Toggle map view';
            }
        });
    }
});
