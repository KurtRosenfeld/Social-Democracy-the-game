// game.js - Core game engine

// Map Manager - imported but not initialized yet
let mapManager = null;

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
    },
    variables: {} // Added for future use
};

// Simplified map state
let mapState = {
    initialized: false,
    // We'll store which countries are active based on game variables
    activeCountries: new Set(['GER1', 'FRA1', 'UK', 'AUHUN', 'RUS1', 'IT1', 'MORC', 'GRE', 'SERB', 'MONT', 'SPA', 'PORT', 'SWI', 'SWE', 'DEN', 'NED', 'LUX', 'BEL']) // 1890 default
};

// Event data storage
let events = [];
let currentEvent = null;

const EVENT_FOLDER = 'data/events/';

// Initialize game
async function initializeGame() {
    console.log("Initializing game...");
    
    // Load all event files
    await loadAllEvents();
    
    // DON'T initialize map yet - wait for user to click map button
    // This keeps loading fast
    
    // Update UI with initial state
    updateGameUI();
    
    // Update map tab
    updateMapTab();
    
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
            conditions: { year: 1890, month: 8 }, // Changed to object format
            maxVisits: 1,
            content: ["Hello there! I hope this will work"],
            choices: [
                { 
                    text: "We seek closer collaboration with friendly parties in the Reichstag.", 
                    subtitle: "tis is a stupid idea",
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

// Check if event conditions are met
function checkCondition(event) {
    // Handle object-based conditions (new JSON format)
    if (event.conditions) {
        const cond = event.conditions;
        if (cond.year !== undefined && cond.year !== gameState.year) {
            return false;
        }
        if (cond.month !== undefined && cond.month !== gameState.month) {
            return false;
        }
        return true;
    }
    
    // Handle string-based conditions (old format - for backward compatibility)
    if (!event.condition) return true;
    
    const conditions = event.condition.split(' and ');
    for (let cond of conditions) {
        const parts = cond.trim().split(/\s*=\s*/);
        if (parts.length === 2) {
            const variable = parts[0].trim();
            const value = parseInt(parts[1].trim());
            
            if (variable === 'year' && value !== gameState.year) {
                return false;
            }
            if (variable === 'month' && value !== gameState.month) {
                return false;
            }
        }
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
    } else {
        console.log("No event found!");
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
    
    // Apply effects
    applyChoiceEffects(currentEvent, choiceId);
    
    // Update UI
    updateGameUI();
    
    // Clear screen and check for next event
    setTimeout(() => {
        checkAndShowEvent();
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

// Check and show appropriate event for current date
function checkAndShowEvent() {
    // Find events that match current conditions and haven't been visited too many times
    const matchingEvents = events.filter(event => {
        // Check condition
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
        // Show the first matching event
        showEvent(matchingEvents[0]);
        gameState.visitedEvents.add(matchingEvents[0].id);
    } else {
        // No events for this date
        showNoEventScreen();
    }
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

// Advance time by one month
function advanceTime() {
    gameState.month += 1;
    
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

// Initialize map (minimal)
async function initializeMap() {
    try {
        // Only load map if user clicks map button
        const mapModule = await import('./mapfunction/map-init.js');
        mapManager = mapModule.default;
        
        // Initialize but don't apply any logic
        const success = await mapManager.initialize('europe-map');
        
        if (success) {
            console.log('Map loaded for display only');
            mapState.initialized = true;
            
            // Just set up basic hover/click
            setupBasicMapListeners();
            
            // Apply any initial state from game variables
            applyMapFromGameState();
        }
    } catch (error) {
        console.error('Could not load map:', error);
    }
}

function setupBasicMapListeners() {
    if (!mapManager) return;
    
    // Simple click to show country name
    window.addEventListener('provinceSelected', (event) => {
        const { provinceId, ownerKey } = event.detail;
        const stats = mapManager.getOwnerStats();
        const countryName = stats[ownerKey]?.name || ownerKey;
        
        // Just show a simple alert or update a small info box
        showSimpleCountryInfo(countryName, ownerKey);
    });
}

function showSimpleCountryInfo(countryName, countryCode) {
    // Simple info display - not a major game feature
    const infoBox = document.getElementById('map-info-box') || createSimpleInfoBox();
    
    infoBox.innerHTML = `
        <h4>${countryName}</h4>
        <p>Click "Advance Time" to progress the game.</p>
        <p><small>Country code: ${countryCode}</small></p>
    `;
    infoBox.style.display = 'block';
}

function createSimpleInfoBox() {
    const box = document.createElement('div');
    box.id = 'map-info-box';
    box.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 20px;
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        max-width: 250px;
        display: none;
    `;
    document.getElementById('map-container').appendChild(box);
    return box;
}

// Called when game state changes (from events) - optional
function updateMapFromGameVariables() {
    if (!mapManager || !mapState.initialized) return;
    
    // Example: If event sets "german_war_loss" variable, change map
    if (gameState.variables && gameState.variables.german_war_loss === true) {
        // Maybe change some border provinces
        // This would be triggered by specific event choices
    }
    
    // Example: If 1919, show Versailles borders
    if (gameState.year >= 1919) {
        showPostWarborders();
    }
}

// Simple function to show borders for a specific year - optional
function showPostWarborders() {
    if (!mapManager) return;
    
    // This is where you'd put logic triggered by events
    // Example: If Poland independent variable is true
    if (gameState.variables?.poland_independent === true) {
        // Transfer some provinces to POL1
        // mapManager.transferProvince('some_id', 'POL1');
    }
}

// Apply map changes based on game state
function applyMapFromGameState() {
    if (!mapManager || !mapState.initialized) return;
    
    // This is where you'd put logic triggered by events
    // Example: If 1919, show Versailles borders
    if (gameState.year >= 1919) {
        showPostWarborders();
    }
}

function updateMapTab() {
    const mapTab = document.getElementById('tab-map');
    
    if (!mapTab) return;
    
    // Very simple map tab
    mapTab.innerHTML = `
        <h3><i class="fas fa-map"></i> European Map</h3>
        <p style="font-size: 0.9em; color: #666;">${gameState.year} - Visual reference only</p>
        
        <div style="margin: 15px 0; padding: 15px; background: rgba(0,0,0,0.05); border-radius: 5px;">
            <h4>Current Borders</h4>
            <p style="font-size: 0.9em;">The map shows European borders. Changes occur based on historical events in the game.</p>
            <p style="font-size: 0.8em; color: #888; margin-top: 10px;">
                <i class="fas fa-info-circle"></i> This is a visual aid. Game progress happens through event decisions.
            </p>
        </div>
        
        <div class="map-controls" style="margin: 15px 0;">
            <button class="map-control-btn" id="inline-map-toggle" style="width: 100%; margin-bottom: 10px;">
                <i class="fas fa-eye"></i> Show Full Screen Map
            </button>
            
            <div style="margin: 15px 0; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 5px;">
                <h4>How the map works:</h4>
                <ul style="font-size: 0.9rem; padding-left: 20px;">
                    <li>Borders change based on event choices</li>
                    <li>Click countries to see names</li>
                    <li>No game mechanics - just visual</li>
                    <li>Returns to event view after clicking</li>
                </ul>
            </div>
        </div>
    `;
    
    // Reattach toggle button
    const inlineMapBtn = document.getElementById('inline-map-toggle');
    if (inlineMapBtn) {
        inlineMapBtn.addEventListener('click', function() {
            const mapToggleBtn = document.getElementById('toggle-map-btn');
            if (mapToggleBtn) mapToggleBtn.click();
        });
    }
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
            
            if (tabName === 'map') {
                updateMapTab();
            }
        });
    });
    
    // Setup map toggle button - LAZY LOADING
    const toggleMapBtn = document.getElementById('toggle-map-btn');
    if (toggleMapBtn) {
        toggleMapBtn.addEventListener('click', async function() {
            const eventContainer = document.getElementById('event-container');
            const mapContainer = document.getElementById('map-container');
            
            if (eventContainer.style.display !== 'none') {
                // Switching TO map view - load map now
                eventContainer.style.display = 'none';
                mapContainer.style.display = 'block';
                
                this.innerHTML = '<i class="fas fa-scroll"></i> Events';
                this.title = 'Return to events';
                
                // Initialize map if not already done
                if (!mapState.initialized) {
                    await initializeMap();
                }
                
            } else {
                // Switching FROM map view
                eventContainer.style.display = 'block';
                mapContainer.style.display = 'none';
                this.innerHTML = '<i class="fas fa-map"></i> Map';
                this.title = 'View European map';
                
                // Hide map info box
                const infoBox = document.getElementById('map-info-box');
                if (infoBox) infoBox.style.display = 'none';
            }
        });
    }
});
