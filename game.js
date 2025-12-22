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
    
    // Load event files
    loadEvents();
    
    // Update UI with initial state
    updateGameUI();
    
    // Check for initial events
    checkEvents();
}

// Load all event files
async function loadEvents() {
    try {
        // Load your event file
        const response = await fetch('events/august-days.yaml');
        const yamlText = await response.text();
        
        // Parse YAML (you'll need a YAML parser library or use simple parsing)
        const eventData = parseSimpleYAML(yamlText);
        
        // Store event
        events[eventData.title] = eventData;
        
        console.log("Loaded event:", eventData.title);
        
    } catch (error) {
        console.error("Error loading events:", error);
        // Fallback to a test event
        createTestEvent();
    }
}

// Simple YAML parser for basic event format
function parseSimpleYAML(yamlText) {
    const lines = yamlText.split('\n');
    const event = {};
    let currentSection = '';
    let choiceId = '';
    
    for (let line of lines) {
        line = line.trim();
        
        if (line.startsWith('title:')) {
            event.title = line.substring(6).trim();
        } else if (line.startsWith('subtitle:')) {
            event.subtitle = line.substring(9).trim();
        } else if (line.startsWith('tags:')) {
            event.tags = line.substring(5).trim();
        } else if (line.startsWith('view-if:')) {
            event.condition = line.substring(8).trim();
        } else if (line.startsWith('max-visits:')) {
            event.maxVisits = parseInt(line.substring(11).trim());
        } else if (line === '---') {
            // Section separator
            currentSection = 'content';
            event.content = [];
        } else if (line.startsWith('- [')) {
            // Choice option
            if (!event.choices) event.choices = [];
            const match = line.match(/^- \[(.*?)\] @(\w+)/);
            if (match) {
                event.choices.push({
                    text: match[1],
                    id: match[2]
                });
            }
        } else if (line.startsWith('@')) {
            // Choice definition
            choiceId = line.substring(1).trim();
            if (!event.choiceEffects) event.choiceEffects = {};
            event.choiceEffects[choiceId] = { onArrival: '' };
        } else if (line.startsWith('on-arrival:')) {
            // Choice effects
            if (choiceId && event.choiceEffects[choiceId]) {
                event.choiceEffects[choiceId].onArrival = line.substring(11).trim();
            }
        } else if (line && currentSection === 'content' && !line.startsWith('@')) {
            // Content text (skip choice definitions)
            if (line.startsWith('"')) {
                event.content.push(line.substring(1, line.length - 1));
            } else {
                event.content.push(line);
            }
        }
    }
    
    return event;
}

// Check conditions and trigger events
function checkEvents() {
    for (const eventName in events) {
        const event = events[eventName];
        
        // Check view-if condition
        if (checkCondition(event.condition)) {
            // Check max visits
            if (!gameState.visitedEvents.has(eventName) || 
                (event.maxVisits && gameState.visitedEvents.count(eventName) < event.maxVisits)) {
                
                // Show event
                showEvent(event);
                gameState.visitedEvents.add(eventName);
                break; // Show only one event at a time
            }
        }
    }
}

// Check condition string
function checkCondition(condition) {
    if (!condition) return true;
    
    // Simple condition parser
    // Example: "year = 1890 and month = 8"
    const conditions = condition.split(' and ');
    
    for (let cond of conditions) {
        const parts = cond.trim().split(/\s*=\s*/);
        if (parts.length === 2) {
            const variable = parts[0].trim();
            const value = parts[1].trim();
            
            if (variable === 'year' && parseInt(value) !== gameState.year) {
                return false;
            }
            if (variable === 'month' && parseInt(value) !== gameState.month) {
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
    if (event.choices) {
        event.choices.forEach(choice => {
            const button = document.createElement('button');
            button.className = 'choice-btn';
            button.textContent = choice.text;
            button.dataset.choiceId = choice.id;
            button.onclick = () => selectChoice(choice.id);
            choicesDiv.appendChild(button);
        });
    }
}

// Handle choice selection
function selectChoice(choiceId) {
    if (!currentEvent || !currentEvent.choiceEffects || !currentEvent.choiceEffects[choiceId]) {
        console.log("No effects for choice:", choiceId);
        advanceTime();
        return;
    }
    
    // Parse and apply effects
    const effects = currentEvent.choiceEffects[choiceId].onArrival;
    if (effects) {
        applyEffects(effects);
    }
    
    // Advance time and check for new events
    advanceTime();
}

// Apply effects string
function applyEffects(effects) {
    const statements = effects.split(';');
    
    statements.forEach(statement => {
        const parts = statement.trim().split(/\s*([+\-]?=)\s*/);
        if (parts.length === 3) {
            const variable = parts[0].trim();
            const operator = parts[1].trim();
            const value = parts[2].trim();
            
            if (operator === '+=') {
                if (variable in gameState.stats) {
                    gameState.stats[variable] += parseInt(value);
                } else if (variable === 'month') {
                    gameState.month += parseInt(value);
                } else if (variable === 'year') {
                    gameState.year += parseInt(value);
                }
            }
        }
    });
    
    updateGameUI();
}

// Advance time by one month
function advanceTime() {
    gameState.month += 1;
    
    if (gameState.month > 12) {
        gameState.month = 1;
        gameState.year += 1;
    }
    
    updateGameUI();
    checkEvents();
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
    
    // Update progress bar
    updateYearProgress(gameState.year);
}

// Get formatted date display
function getDateDisplay() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[gameState.month - 1]} ${gameState.year}`;
}

// Create a test event if loading fails
function createTestEvent() {
    events = {
        "Test Event": {
            title: "Test Event",
            subtitle: "Debug Event",
            content: ["This is a test event to debug the system.", "If you see this, your YAML files aren't loading correctly."],
            choices: [
                { text: "Continue", id: "continue" }
            ],
            choiceEffects: {
                continue: { onArrival: "month += 1" }
            }
        }
    };
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Hook up the advance time button
    document.getElementById('next-turn-btn').addEventListener('click', advanceTime);
    
    // Initialize game
    initializeGame();
});
