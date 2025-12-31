import { owners } from './owners.js';

// Core map functions - no UI, just logic
export class MapCore {
    constructor(svgElement) {
        this.svg = svgElement;
        this.svgDoc = null;
        this.provinces = new Map();
    }
    
    initialize() {
        return new Promise((resolve) => {
            this.svg.addEventListener('load', () => {
                this.svgDoc = this.svg.contentDocument;
                this.cacheProvinces();
                this.colorProvinces();
                resolve(this);
            });
        });
    }
    
    cacheProvinces() {
        const provinceElements = this.svgDoc.querySelectorAll('[id^="province_"]');
        provinceElements.forEach(province => {
            const id = province.id.replace('province_', '');
            this.provinces.set(id, province);
        });
    }
    
colorProvinces() {
    // Import provinceOwners if not already imported
    import { provinceOwners } from './owners.js';
    
    this.provinces.forEach((province, id) => {
        const ownerKey = provinceOwners[id] || "None";  // FIXED: Use provinceOwners
        const owner = owners[ownerKey];  // Now look up country by code
        
        if (owner && owner.active) {
            province.style.fill = owner.color;
        } else {
            province.style.fill = "#CCCCCC";
        }
        
        province.dataset.ownerKey = ownerKey;
        province.dataset.provinceId = id;
    });
}
    
    getProvince(id) {
        return this.provinces.get(id);
    }
    
    getAllProvinceIds() {
        return Array.from(this.provinces.keys());
    }
}
