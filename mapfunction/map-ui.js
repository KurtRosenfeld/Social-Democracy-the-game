import { owners } from './owners.js';
import { ProvinceManager } from './province-manager.js';

export class MapUI {
    constructor(mapCore) {
        this.mapCore = mapCore;
        this.tooltip = null;
        this.statsPanel = null;
    }
    
    initializeUI() {
        this.createTooltip();
        this.createStatsPanel();
        this.addProvinceInteractivity();
    }
    
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'map-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: rgba(0,0,0,0.85);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
            pointer-events: none;
            z-index: 1000;
            display: none;
            max-width: 250px;
        `;
        document.getElementById('map-container').appendChild(this.tooltip);
        
        // Track mouse for tooltip positioning
        document.addEventListener('mousemove', (e) => {
            if (this.tooltip.style.display === 'block') {
                this.tooltip.style.left = (e.pageX + 15) + 'px';
                this.tooltip.style.top = (e.pageY - 15) + 'px';
            }
        });
    }
    
    createStatsPanel() {
        this.statsPanel = document.createElement('div');
        this.statsPanel.id = 'owner-stats-panel';
        this.statsPanel.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            max-width: 300px;
            font-size: 14px;
        `;
        
        document.getElementById('map-container').appendChild(this.statsPanel);
        this.updateStatsPanel();
        
        // Update stats when provinces change
        window.addEventListener('provinceChanged', () => this.updateStatsPanel());
    }
    
    updateStatsPanel() {
        const stats = ProvinceManager.getOwnerStats();
        let html = '<h4 style="margin-top: 0;">Geopolitcal Current</h4>';
        
        Object.values(stats).forEach(stat => {
            html += `
                <div style="margin-bottom: 8px; display: flex; align-items: center;">
                    <span style="display: inline-block; width: 12px; height: 12px; 
                           background-color: ${stat.color}; margin-right: 8px; border-radius: 2px;"></span>
                    <span style="flex-grow: 1;">${stat.name}</span>
                    <span style="font-weight: bold;">${stat.provinceCount}</span>
                </div>
            `;
        });
        
        this.statsPanel.innerHTML = html;
    }
    
    addProvinceInteractivity() {
        this.mapCore.provinces.forEach((province, id) => {
            // Hover effects
            province.addEventListener('mouseenter', (e) => this.showTooltip(e, id));
            province.addEventListener('mouseleave', () => this.hideTooltip());
            
            // Click handler
            province.addEventListener('click', (e) => this.handleProvinceClick(e, id));
            
            // Visual effects
            province.style.cursor = 'pointer';
            province.style.transition = 'fill 0.2s ease';
        });
    }
    
showTooltip(event, provinceId) {
    const ownerKey = provinceOwners[provinceId] || "None";  // FIXED
    const owner = owners[ownerKey];
    // ...
}
    
    hideTooltip() {
        this.tooltip.style.display = 'none';
    }
    
    handleProvinceClick(event, provinceId) {
        // Your game logic here - could open a modal, show details, etc.
        console.log(`Province ${provinceId} clicked`);
        
        // Dispatch event for game.js to handle
        window.dispatchEvent(new CustomEvent('provinceSelected', {
            detail: {
                provinceId,
                ownerKey: provinceOwners[provinceId] || "None"
            }
        }));
    }
}
