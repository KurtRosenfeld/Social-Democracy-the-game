import { owners } from './owners.js';

export class ProvinceManager {
    static transferProvince(provinceId, newOwnerKey, provinceElement = null) {
        const currentOwnerKey = provinceOwners[provinceId] || "None";
        
        // Remove from current owner
        if (currentOwnerKey !== "None" && owners[currentOwnerKey]) {
            this.removeFromOwner(provinceId, currentOwnerKey);
        }
        
        // Add to new owner
        if (newOwnerKey === "None") {
            this.unassignProvince(provinceId, provinceElement);
        } else if (owners[newOwnerKey]) {
            this.assignToOwner(provinceId, newOwnerKey, provinceElement);
        }
        
        // Update global state
        this.updateGlobalState();
        return true;
    }
    
    static removeFromOwner(provinceId, ownerKey) {
        const owner = owners[ownerKey];
        if (!owner) return;
        
        const index = owner.provinces.indexOf(provinceId);
        if (index > -1) {
            owner.provinces.splice(index, 1);
            owner.seats = owner.provinces.length;
            
            if (owner.provinces.length === 0) {
                owner.active = false;
            }
        }
    }
    
    static assignToOwner(provinceId, ownerKey, element) {
        const owner = owners[ownerKey];
        if (!owner) return;
        
        owner.provinces.push(provinceId);
        owner.seats = owner.provinces.length;
        owner.active = true;
        
        // Update visual if element provided
        if (element) {
            element.style.fill = owner.color;
            element.dataset.ownerKey = ownerKey;
        }
        
        // Update ownership map
        provinceOwners[provinceId] = ownerKey;
    }
    
    static unassignProvince(provinceId, element) {
        if (element) {
            element.style.fill = "#CCCCCC";
            element.dataset.ownerKey = "None";
        }
        delete provinceOwners[provinceId];
    }
    
    static updateGlobalState() {
        // Dispatch custom event for other modules to react
        window.dispatchEvent(new CustomEvent('provinceChanged', {
            detail: { owners, provinceOwners }
        }));
    }
    
    static getOwnerStats() {
        const stats = {};
        Object.entries(owners).forEach(([key, owner]) => {
            stats[key] = {
                name: owner.name,
                color: owner.color,
                provinceCount: owner.provinces.length,
                percentage: Math.round((owner.provinces.length / 270) * 100),
                active: owner.active
            };
        });
        return stats;
    }
}
