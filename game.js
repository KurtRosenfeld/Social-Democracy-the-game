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
let events = [];
let currentEvent = null;

const EVENT_FOLDER = 'data/events/'; // Add this here, at the top

// Initialize game
function initializeGame() {
    console.log("Initializing game...");
    
    // Load all event files
    loadAllEvents();
    
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
            condition: "year = 1890 and month = 8",
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
        
        // List of event files to load
        const eventFiles = ['september.dry', 'october.dry'];
        
        // Load each event file
        for (const filename of eventFiles) {
            try {
                const response = await fetch(`${EVENT_FOLDER}${filename}`);
                if (response.ok) {
                    const content = await response.text();
                    const eventId = filename.replace('.dry', '');
                    const event = parseDryContent(content, eventId);
                    if (event) {
                        events.push(event);
                        console.log(`Loaded ${filename} as ${eventId}`);
                    }
                } else {
                    console.warn(`File not found: ${EVENT_FOLDER}${filename}`);
                }
            } catch (e) {
                console.warn(`Could not load ${filename}:`, e);
            }
        }
        
        console.log("Total events loaded:", events.length);
        
    } catch (error) {
        console.error("Error loading events:", error);
    }
}

// Parse .dry content (handles both JSON and YAML formats)
function parseDryContent(content, filename) {
    content = content.trim();
    
    // Check if it's JSON format
    if (content.startsWith('{')) {
        try {
            const jsonEvent = JSON.parse(content);
            // Convert to standard format
            return {
                id: filename,
                title: jsonEvent.title || "Untitled Event",
                subtitle: jsonEvent.subtitle || "",
                condition: `year = ${jsonEvent.conditions?.year || 1890} and month = ${jsonEvent.conditions?.month || 1}`,
                maxVisits: jsonEvent.maxVisits || 1,
                content: jsonEvent.content || ["No content"],
                choices: (jsonEvent.choices || []).map(choice => ({
                    text: choice.text || "Choice",
                    id: choice.id || "choice",
                    effects: choice.effects || {}
                }))
            };
        } catch (e) {
            console.error("Error parsing JSON event:", e);
            return null;
        }
    }
    // Otherwise, parse as YAML format
    else {
        return parseYamlDry(content, filename);
    }
}

// Parse YAML-like .dry format
function parseYamlDry(content, filename) {
    const lines = content.split('\n');
    const event = { 
        id: filename,
        title: "Untitled Event",
        subtitle: "",
        condition: "",
        maxVisits: 1,
        content: [],
        choices: [],
        choiceEffects: {}
    };
    
    let inContentSection = false;
    let inChoiceSection = false;
    let currentChoiceId = '';
    
    for (let line of lines) {
        line = line.trim();
        
        if (line.startsWith('title:')) {
            event.title = line.substring(6).trim();
        } else if (line.startsWith('subtitle:')) {
            event.subtitle = line.substring(9).trim();
        } else if (line.startsWith('view-if:')) {
            event.condition = line.substring(8).trim();
        } else if (line.startsWith('max-visits:')) {
            event.maxVisits = parseInt(line.substring(11).trim()) || 1;
        } else if (line === '---') {
            if (!inContentSection) {
                inContentSection = true;
            } else if (!inChoiceSection) {
                inChoiceSection = true;
            }
        } else if (line.startsWith('- [')) {
            // Choice option
            const match = line.match(/^- \[(.*?)\] @(\w+)/);
            if (match) {
                event.choices.push({
                    text: match[1],
                    id: match[2]
                });
            }
        } else if (line.startsWith('@')) {
            // Choice definition
            currentChoiceId = line.substring(1).trim();
            event.choiceEffects[currentChoiceId] = { onArrival: '' };
        } else if (line.startsWith('on-arrival:')) {
            // Choice effects
            if (currentChoiceId && event.choiceEffects[currentChoiceId]) {
                event.choiceEffects[currentChoiceId].onArrival = line.substring(11).trim();
            }
        } else if (line && inContentSection && !inChoiceSection && 
                   !line.startsWith('@') && !line.startsWith('- [') && 
                   line !== '---') {
            // Content text (remove quotes if present)
            let text = line;
            if (text.startsWith('"') && text.endsWith('"')) {
                text = text.substring(1, text.length - 1);
            }
            event.content.push(text);
        }
    }
    
    return event;
}

// Load and display initial August event
function loadInitialEvent() {
    // Find August event
    const augustEvent = events.find(event => {
        return checkCondition(event.condition) && 
               !gameState.visitedEvents.has(event.id);
    });
    
    if (augustEvent) {
        showEvent(augustEvent);
        gameState.visitedEvents.add(augustEvent.id);
    } else {
        showNoEventScreen();
    }
}

// Check condition string
function checkCondition(condition) {
    if (!condition) return true;
    
    const conditions = condition.split(' and ');
    
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
    // Handle JSON format events (effects in choice object)
    if (event.choices) {
        const choice = event.choices.find(c => c.id === choiceId);
        if (choice && choice.effects) {
            Object.entries(choice.effects).forEach(([key, value]) => {
                if (key === 'month') {
                    gameState.month += value;
                    if (gameState.month > 12) {
                        gameState.year += Math.floor((gameState.month - 1) / 12);
                        gameState.month = ((gameState.month - 1) % 12) + 1;
                    }
                } else if (key in gameState.stats) {
                    gameState.stats[key] += value;
                }
            });
        }
    }
    
    // Handle YAML format events (effects in choiceEffects)
    if (event.choiceEffects && event.choiceEffects[choiceId]) {
        const effects = event.choiceEffects[choiceId].onArrival;
        if (effects) {
            applyEffectsString(effects);
        }
    }
    
    console.log("Game state after effects:", gameState);
}

// Apply effects string (for YAML format)
function applyEffectsString(effects) {
    const statements = effects.split(';');
    
    statements.forEach(statement => {
        const trimmed = statement.trim();
        if (!trimmed) return;
        
        const parts = trimmed.split(/\s*([+\-]?=)\s*/);
        if (parts.length === 3) {
            const variable = parts[0].trim();
            const operator = parts[1].trim();
            const value = parseInt(parts[2].trim());
            
            if (operator === '+=') {
                if (variable in gameState.stats) {
                    gameState.stats[variable] += value;
                } else if (variable === 'month') {
                    gameState.month += value;
                    if (gameState.month > 12) {
                        gameState.year += Math.floor((gameState.month - 1) / 12);
                        gameState.month = ((gameState.month - 1) % 12) + 1;
                    }
                } else if (variable === 'year') {
                    gameState.year += value;
                }
            }
        }
    });
}

// Check and show appropriate event for current date
function checkAndShowEvent() {
    // Find events that match current conditions and haven't been visited too many times
    const matchingEvents = events.filter(event => {
        // Check condition
        if (!checkCondition(event.condition)) {
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, setting up game...");
    
    // Connect the "Advance Time" button
    const nextTurnBtn = document.getElementById('next-turn-btn');
    if (nextTurnBtn) {
        nextTurnBtn.addEventListener('click', advanceTime);
    }
    
    // Initialize the game
    initializeGame();
    
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
