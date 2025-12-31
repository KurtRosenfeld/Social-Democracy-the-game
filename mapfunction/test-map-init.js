// test-map-init.js - Minimal working version
console.log('Test map module loading...');

class MapManager {
    async initialize() {
        console.log('Test map initialized');
        return true;
    }
    
    getOwnerStats() {
        return {};
    }
    
    transferProvince() {
        return false;
    }
}

const mapManager = new MapManager();
export default mapManager;
