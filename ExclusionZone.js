/**
 * ExclusionZone - Defines regions where particles cannot form connections
 * Used for creating shapes with holes or disconnected regions
 */
class ExclusionZone {
  /**
   * Create a new exclusion zone
   * @param {string} type - Type of exclusion zone ('sphere', 'cylinder', 'box', etc.)
   * @param {Object} params - Parameters for the exclusion zone
   */
  constructor(type, params) {
    this.type = type;
    this.params = params;
  }
  
  /**
   * Check if a point is inside the exclusion zone
   * @param {Object} point - Point with x, y, z coordinates
   * @returns {boolean} - True if point is inside exclusion zone
   */
  contains(point) {
    switch(this.type) {
      case 'sphere':
        return this.containsSphere(point);
      case 'cylinder':
        return this.containsCylinder(point);
      case 'box':
        return this.containsBox(point);
      default:
        return false;
    }
  }
  
  /**
   * Check if a line segment intersects the exclusion zone
   * @param {Object} p1 - First point with x, y, z coordinates
   * @param {Object} p2 - Second point with x, y, z coordinates
   * @returns {boolean} - True if line segment intersects exclusion zone
   */
  intersectsLine(p1, p2) {
    switch(this.type) {
      case 'sphere':
        return this.intersectsLineSphere(p1, p2);
      case 'cylinder':
        return this.intersectsLineCylinder(p1, p2);
      case 'box':
        return this.intersectsLineBox(p1, p2);
      default:
        return false;
    }
  }
  
  /**
   * Check if a point is inside a sphere exclusion zone
   * @param {Object} point - Point with x, y, z coordinates
   * @returns {boolean} - True if point is inside sphere
   */
  containsSphere(point) {
    const dx = point.x - this.params.x;
    const dy = point.y - this.params.y;
    const dz = point.z - this.params.z;
    const distSquared = dx*dx + dy*dy + dz*dz;
    return distSquared <= this.params.radius * this.params.radius;
  }
  
  /**
   * Check if a point is inside a cylinder exclusion zone
   * @param {Object} point - Point with x, y, z coordinates
   * @returns {boolean} - True if point is inside cylinder
   */
  containsCylinder(point) {
    const { x, y, z, radius, height, axis } = this.params;
    const halfHeight = height / 2;
    
    // Calculate distance from point to cylinder axis
    let axialDist, radialDistSq;
    
    switch(axis) {
      case 'x':
        axialDist = Math.abs(point.x - x);
        radialDistSq = Math.pow(point.y - y, 2) + Math.pow(point.z - z, 2);
        break;
      case 'y':
        axialDist = Math.abs(point.y - y);
        radialDistSq = Math.pow(point.x - x, 2) + Math.pow(point.z - z, 2);
        break;
      case 'z':
      default:
        axialDist = Math.abs(point.z - z);
        radialDistSq = Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2);
        break;
    }
    
    // Check if point is within cylinder bounds
    return axialDist <= halfHeight && radialDistSq <= radius * radius;
  }
  
  /**
   * Check if a point is inside a box exclusion zone
   * @param {Object} point - Point with x, y, z coordinates
   * @returns {boolean} - True if point is inside box
   */
  containsBox(point) {
    const { x, y, z, width, height, depth } = this.params;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const halfDepth = depth / 2;
    
    return (
      point.x >= x - halfWidth && point.x <= x + halfWidth &&
      point.y >= y - halfHeight && point.y <= y + halfHeight &&
      point.z >= z - halfDepth && point.z <= z + halfDepth
    );
  }
  
  /**
   * Check if a line segment intersects a sphere exclusion zone
   * @param {Object} p1 - First point with x, y, z coordinates
   * @param {Object} p2 - Second point with x, y, z coordinates
   * @returns {boolean} - True if line segment intersects sphere
   */
  intersectsLineSphere(p1, p2) {
    const { x, y, z, radius } = this.params;
    
    // Vector from p1 to sphere center
    const dx = x - p1.x;
    const dy = y - p1.y;
    const dz = z - p1.z;
    
    // Vector from p1 to p2
    const dirX = p2.x - p1.x;
    const dirY = p2.y - p1.y;
    const dirZ = p2.z - p1.z;
    
    // Length of direction vector
    const lenSq = dirX*dirX + dirY*dirY + dirZ*dirZ;
    const len = Math.sqrt(lenSq);
    
    // Normalize direction vector
    const normX = dirX / len;
    const normY = dirY / len;
    const normZ = dirZ / len;
    
    // Project vector to sphere center onto line direction
    const dot = dx*normX + dy*normY + dz*normZ;
    
    // Find closest point on line to sphere center
    const closestX = p1.x + normX * dot;
    const closestY = p1.y + normY * dot;
    const closestZ = p1.z + normZ * dot;
    
    // Check if closest point is on line segment
    const t = dot / len;
    if (t < 0 || t > 1) {
      // Closest point is outside line segment
      return false;
    }
    
    // Check distance from closest point to sphere center
    const distX = closestX - x;
    const distY = closestY - y;
    const distZ = closestZ - z;
    const distSq = distX*distX + distY*distY + distZ*distZ;
    
    // Line intersects sphere if closest point is within radius
    return distSq <= radius * radius;
  }
  
  /**
   * Check if a line segment intersects a cylinder exclusion zone
   * @param {Object} p1 - First point with x, y, z coordinates
   * @param {Object} p2 - Second point with x, y, z coordinates
   * @returns {boolean} - True if line segment intersects cylinder
   */
  intersectsLineCylinder(p1, p2) {
    const { x, y, z, radius, height, axis } = this.params;
    const halfHeight = height / 2;
    
    // Transform points to cylinder-local coordinates
    const p1Local = { x: p1.x - x, y: p1.y - y, z: p1.z - z };
    const p2Local = { x: p2.x - x, y: p2.y - y, z: p2.z - z };
    
    // Line direction vector
    const dx = p2Local.x - p1Local.x;
    const dy = p2Local.y - p1Local.y;
    const dz = p2Local.z - p1Local.z;
    
    // Variables for cylinder test based on axis
    let a, b, c;
    let axisValue1, axisValue2;
    
    switch(axis) {
      case 'x':
        a = dy * dy + dz * dz;
        b = 2 * (p1Local.y * dy + p1Local.z * dz);
        c = p1Local.y * p1Local.y + p1Local.z * p1Local.z - radius * radius;
        axisValue1 = p1Local.x;
        axisValue2 = p2Local.x;
        break;
      case 'y':
        a = dx * dx + dz * dz;
        b = 2 * (p1Local.x * dx + p1Local.z * dz);
        c = p1Local.x * p1Local.x + p1Local.z * p1Local.z - radius * radius;
        axisValue1 = p1Local.y;
        axisValue2 = p2Local.y;
        break;
      case 'z':
      default:
        a = dx * dx + dy * dy;
        b = 2 * (p1Local.x * dx + p1Local.y * dy);
        c = p1Local.x * p1Local.x + p1Local.y * p1Local.y - radius * radius;
        axisValue1 = p1Local.z;
        axisValue2 = p2Local.z;
        break;
    }
    
    // Solve quadratic equation for intersection with infinite cylinder
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) {
      // No intersection with infinite cylinder
      return false;
    }
    
    // Calculate intersection points
    const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
    
    // Check if intersection points are within line segment
    if ((t1 < 0 || t1 > 1) && (t2 < 0 || t2 > 1)) {
      // Intersections outside line segment
      return false;
    }
    
    // Check if intersection points are within cylinder height
    // For t1
    if (t1 >= 0 && t1 <= 1) {
      const axisPos = axisValue1 + t1 * (axisValue2 - axisValue1);
      if (axisPos >= -halfHeight && axisPos <= halfHeight) {
        return true;
      }
    }
    
    // For t2
    if (t2 >= 0 && t2 <= 1) {
      const axisPos = axisValue1 + t2 * (axisValue2 - axisValue1);
      if (axisPos >= -halfHeight && axisPos <= halfHeight) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if a line segment intersects a box exclusion zone
   * @param {Object} p1 - First point with x, y, z coordinates
   * @param {Object} p2 - Second point with x, y, z coordinates
   * @returns {boolean} - True if line segment intersects box
   */
  intersectsLineBox(p1, p2) {
    const { x, y, z, width, height, depth } = this.params;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const halfDepth = depth / 2;
    
    // Box bounds
    const minX = x - halfWidth;
    const maxX = x + halfWidth;
    const minY = y - halfHeight;
    const maxY = y + halfHeight;
    const minZ = z - halfDepth;
    const maxZ = z + halfDepth;
    
    // Line segment parameters
    const dirX = p2.x - p1.x;
    const dirY = p2.y - p1.y;
    const dirZ = p2.z - p1.z;
    
    // Check for parallel lines (avoid division by zero)
    const txMin = dirX === 0 ? -Infinity : (minX - p1.x) / dirX;
    const txMax = dirX === 0 ? Infinity : (maxX - p1.x) / dirX;
    const tyMin = dirY === 0 ? -Infinity : (minY - p1.y) / dirY;
    const tyMax = dirY === 0 ? Infinity : (maxY - p1.y) / dirY;
    const tzMin = dirZ === 0 ? -Infinity : (minZ - p1.z) / dirZ;
    const tzMax = dirZ === 0 ? Infinity : (maxZ - p1.z) / dirZ;
    
    // Find largest minimum and smallest maximum
    const tMin = Math.max(
      Math.min(txMin, txMax),
      Math.min(tyMin, tyMax),
      Math.min(tzMin, tzMax)
    );
    
    const tMax = Math.min(
      Math.max(txMin, txMax),
      Math.max(tyMin, tyMax),
      Math.max(tzMin, tzMax)
    );
    
    // Check if there is an intersection
    if (tMax < 0 || tMin > tMax) {
      return false;
    }
    
    // Check if intersection is within line segment
    return tMin <= 1 && tMax >= 0;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExclusionZone;
}
