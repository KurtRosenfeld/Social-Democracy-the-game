// Enhanced game.js - Complete working version

let gameState = {
    year: 1890,
    month: 8,
    visitedEvents: new Set(),
    choicesMade: {},
    queuedEvents: [],
    newMonth: false,
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

let events = [];
let currentEvent = null;
let eventsShownThisMonth = new Set();
const EVENT_FOLDER = 'data/events/';

// Initialize game
async function initializeGame() {
    console.log("Initializing game...");
    
    // Load all event files
    await loadAllEvents();
    
    // Update UI with initial state
    updateGameUI();
    
    // Load initial August event
    loadInitialEvent();
}

// Load all event files
async function loadAllEvents() {
    try {
        // First, load the manual August event
        events.push({
            id: 'august-manual',
            title: "The August Days",
            subtitle: "Welcome to the game",
            conditions: { year: 1890, month: 8 },
            maxVisits: 1,
            content: ["Hello there!", "I hope this will work"],
            choices: [
                { 
                    text: "We seek closer collaboration with friendly parties in the Reichstag.", 
                    id: "thank",
                    effects: { zc_relation: 2, fvp_relation: 5, reformist_strength: 3, month: 1 }
                },
                { 
                    text: "We host a few parades across the country.", 
                    id: "celebrate",
                    effects: { month: 1 }
                }
            ]
        });
        
        // Load events from manifest
        await loadEventsWithManifest();
        
        console.log("Total events loaded:", events.length);
        
    } catch (error) {
        console.error("Error loading events:", error);
    }
}

// Function to load events using manifest.json
async function loadEventsWithManifest() {
    try {
        // Load manifest first
        const manifestResponse = await fetch(`${EVENT_FOLDER}manifest.json`);
        const manifest = await manifestResponse.json();
        
        // Load all events listed in manifest
        for (const filename of manifest.events) {
            try {
                const response = await fetch(`${EVENT_FOLDER}${filename}`);
                if (!response.ok) {
                    console.warn(`File not found: ${filename}`);
                    continue;
                }
                const event = await response.json();
                events.push(event);
                console.log(`✓ Loaded ${filename}`);
            } catch (error) {
                console.error(`Error loading ${filename}:`, error);
            }
        }
        
    } catch (error) {
        console.error("Error loading manifest:", error);
    }
}

// Enhanced condition checking
function checkCondition(event) {
    if (!event.conditions) return true;
    
    if (Array.isArray(event.conditions)) {
        return evaluateConditionsArray(event.conditions);
    }
    
    return evaluateCondition(event.conditions);
}

function evaluateConditionsArray(conditions) {
    for (const condition of conditions) {
        if (!evaluateCondition(condition)) {
            return false;
        }
    }
    return true;
}

function evaluateCondition(condition) {
    // Date conditions
    if (condition.year !== undefined && condition.year !== gameState.year) {
        return false;
    }
    if (condition.month !== undefined && condition.month !== gameState.month) {
        return false;
    }
    
    // Stat conditions
    if (condition.minMembers && gameState.stats.members < condition.minMembers) {
        return false;
    }
    if (condition.maxMembers && gameState.stats.members > condition.maxMembers) {
        return false;
    }
    
    // Relation conditions
    if (condition.minZC && gameState.stats.zc_relation < condition.minZC) {
        return false;
    }
    
    // Random chance
    if (condition.chance && Math.random() > condition.chance) {
        return false;
    }
    
    // Previous event requirement
    if (condition.requiresEvent && !gameState.visitedEvents.has(condition.requiresEvent)) {
        return false;
    }
    
    // Previous choice requirement
    if (condition.requiresChoice) {
        const choiceMade = gameState.choicesMade[condition.requiresChoice.eventId] === condition.requiresChoice.choiceId;
        if (!choiceMade) return false;
    }
    
    // NOT conditions (cannot have happened)
    if (condition.notEvent && gameState.visitedEvents.has(condition.notEvent)) {
        return false;
    }
    
    return true;
}

// Load and display initial August event
function loadInitialEvent() {
    console.log("Looking for August event...");
    console.log("Current events loaded:", events);
    console.log("Current game state:", gameState);
    
    const augustEvent = events.find(event => {
        const conditionMet = checkCondition(event);
        const notVisited = !gameState.visitedEvents.has(event.id);
        console.log(`Event ${event.id}: condition=${conditionMet}, visited=${!notVisited}`);
        return conditionMet && notVisited;
    });
    
    if (augustEvent) {
        console.log("Found event:", augustEvent.title);
        showEvent(augustEvent);
        gameState.visitedEvents.add(augustEvent.id);
        eventsShownThisMonth.add(augustEvent.id);
    } else {
        console.log("No event found!");
        showNoEventScreen();
    }
}

// Enhanced event checking with queuing
function checkAndShowEvent() {
    // Reset monthly tracking
    if (gameState.newMonth) {
        eventsShownThisMonth.clear();
        gameState.newMonth = false;
    }
    
    const matchingEvents = events.filter(event => {
        // Skip if shown this month (unless repeatable)
        if (eventsShownThisMonth.has(event.id) && !event.repeatable) {
            return false;
        }
        
        // Check conditions
        if (!checkCondition(event)) {
            return false;
        }
        
        // Check max visits
        const visitCount = Array.from(gameState.visitedEvents).filter(id => id === event.id).length;
        if (event.maxVisits && visitCount >= event.maxVisits) {
            return false;
        }
        
        return true;
    });
    
    if (matchingEvents.length > 0) {
        const eventToShow = matchingEvents[0];
        showEvent(eventToShow);
        gameState.visitedEvents.add(eventToShow.id);
        eventsShownThisMonth.add(eventToShow.id);
        
        // Queue remaining events
        if (matchingEvents.length > 1) {
            gameState.queuedEvents = matchingEvents.slice(1);
        }
    } else {
        showNoEventScreen();
    }
}

// Display event in UI
function showEvent(event) {
    currentEvent = event;
    
    // Update HTML elements
    document.getElementById('event-title').textContent = event.title;
    if (event.subtitle) {
        document.getElementById('event-title').innerHTML = `${event.title}<br><small>${event.subtitle}</small>`;
    }
    document.getElementById('event-date').textContent = getDateDisplay();
    
    // Update event content
    const contentDiv = document.getElementById('event-content');
    contentDiv.innerHTML = '';
    event.content.forEach(text => {
        const p = document.createElement('p');
        p.textContent = text;
        contentDiv.appendChild(p);
    });
    
    // Update choices
    const choicesDiv = document.getElementById('event-choices');
    const placeholder = choicesDiv.querySelector('.choice-placeholder');
    
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    
    // Clear old choices
    const oldChoices = choicesDiv.querySelectorAll('.choice-btn');
    oldChoices.forEach(choice => choice.remove());
    
    // Add new choices
    if (event.choices && event.choices.length > 0) {
        event.choices.forEach(choice => {
            const button = document.createElement('button');
            button.className = 'choice-btn';
            button.textContent = choice.text;
            button.dataset.choiceId = choice.id;
            button.onclick = () => selectChoice(choice.id);
            choicesDiv.appendChild(button);
        });
    } else {
        // No choices? Add a default continue button
        const button = document.createElement('button');
        button.className = 'choice-btn';
        button.textContent = "Continue";
        button.onclick = () => selectChoice('continue');
        choicesDiv.appendChild(button);
    }
}

// Handle choice selection
function selectChoice(choiceId) {
    if (!currentEvent) {
        console.log("No current event");
        advanceTime();
        return;
    }
    
    console.log("Choice selected:", choiceId, "in event:", currentEvent.id);
    
    // Track choice
    gameState.choicesMade[currentEvent.id] = choiceId;
    
    // Apply effects
    applyChoiceEffects(currentEvent, choiceId);
    
    // Update UI
    updateGameUI();
    
    // Check for queued events or next event
    setTimeout(() => {
        if (gameState.queuedEvents && gameState.queuedEvents.length > 0) {
            const nextEvent = gameState.queuedEvents.shift();
            showEvent(nextEvent);
            gameState.visitedEvents.add(nextEvent.id);
            eventsShownThisMonth.add(nextEvent.id);
        } else {
            checkAndShowEvent();
        }
    }, 300);
}

// Apply choice effects
function applyChoiceEffects(event, choiceId) {
    // Find the selected choice
    const choice = event.choices?.find(c => c.id === choiceId);
    
    if (choice && choice.effects) {
        Object.entries(choice.effects).forEach(([key, value]) => {
            if (key === 'month') {
                // Advance time
                gameState.month += value;
                if (gameState.month > 12) {
                    gameState.year += Math.floor((gameState.month - 1) / 12);
                    gameState.month = ((gameState.month - 1) % 12) + 1;
                }
            } else if (key in gameState.stats) {
                // Update stats
                gameState.stats[key] = (gameState.stats[key] || 0) + value;
            }
        });
    }
    
    console.log("Game state after effects:", gameState);
}

// Show no event screen
function showNoEventScreen() {
    document.getElementById('event-title').textContent = getDateDisplay();
    document.getElementById('event-date').textContent = "";
    
    const contentDiv = document.getElementById('event-content');
    contentDiv.innerHTML = `
        <p>No events are scheduled for this period.</p>
        <p>Press "Advance Time" to continue to the next month.</p>
    `;
    
    const choicesDiv = document.getElementById('event-choices');
    const placeholder = choicesDiv.querySelector('.choice-placeholder');
    
    // Clear choice buttons
    const oldButtons = choicesDiv.querySelectorAll('.choice-btn');
    oldButtons.forEach(btn => btn.remove());
    
    // Show placeholder
    if (placeholder) {
        placeholder.style.display = 'block';
        placeholder.innerHTML = '<p><i>No decisions pending. Advance time to continue.</i></p>';
    }
}

// Modified advanceTime to mark new month
function advanceTime() {
    gameState.month += 1;
    gameState.newMonth = true; // Mark that we're starting a new month
    
    if (gameState.month > 12) {
        gameState.month = 1;
        gameState.year += 1;
    }
    
    updateGameUI();
    
    // Check for events at the new date
    checkAndShowEvent();
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
        nextTurnBtn.addEventListener('click', advanceTime);
    }
    
    // Initialize the game
    initializeGame().catch(error => {
        console.error("Failed to initialize game:", error);
        document.getElementById('event-title').textContent = "Error";
        document.getElementById('event-content').innerHTML = 
            `<p>Failed to load game. Check console for details.</p>`;
    });
    
    // Setup tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
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
                eventContainer.style.display = 'none';
                mapContainer.style.display = 'block';
                this.innerHTML = '<i class="fas fa-scroll"></i> Events';
                this.title = 'Switch back to events view';
            } else {
                eventContainer.style.display = 'block';
                mapContainer.style.display = 'none';
                this.innerHTML = '<i class="fas fa-map"></i> Map';
                this.title = 'Toggle map view';
            }
        });
    }
});
