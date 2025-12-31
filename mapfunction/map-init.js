import { owners, provinceOwners } from './owners.js';
import { MapCore } from './map-core.js';
import { ProvinceManager } from './province-manager.js';
import { MapUI } from './map-ui.js';

class MapManager {
    constructor() {
        this.mapCore = null;
        this.mapUI = null;
        this.isInitialized = false;
    }
    
    async initialize(mapContainerId = 'europe-map') {
        const mapElement = document.getElementById(mapContainerId);
        if (!mapElement) {
            console.error(`Map element #${mapContainerId} not found`);
            return false;
        }
        
        // Initialize core map functionality
        this.mapCore = new MapCore(mapElement);
        await this.mapCore.initialize();
        
        // Initialize UI
        this.mapUI = new MapUI(this.mapCore);
        this.mapUI.initializeUI();
        
        this.isInitialized = true;
        console.log('MapManager initialized successfully');
        
        // Dispatch initialization event
        window.dispatchEvent(new Event('mapInitialized'));
        
        return true;
    }
    
    // Public API methods
    transferProvince(provinceId, newOwnerKey) {
        if (!this.isInitialized) return false;
        
        const provinceElement = this.mapCore.getProvince(provinceId);
        return ProvinceManager.transferProvince(provinceId, newOwnerKey, provinceElement);
    }
    
    getOwnerStats() {
        return ProvinceManager.getOwnerStats();
    }
    
    getAllProvinces() {
        return this.mapCore.getAllProvinceIds();
    }
    
    // Utility methods
    resetMap() {
        // Implement reset logic if needed
    }
}

// Create singleton instance
const mapManager = new MapManager();

// Export only the mapManager
export default mapManager;

// If game.js needs owners and provinceOwners, they should import them directly
// from owners.js, not from map-init.js
