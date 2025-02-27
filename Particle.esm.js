/**
 * Particle - Represents a single particle in the 3D mesh
 * Handles position, velocity, and state transitions for individual particles
 */
class Particle {
  /**
   * Create a new particle
   * @param {Object} config - Configuration object
   */
  constructor(config) {
    // Position
    this.x = (Math.random() * 2 - 1) * config.BOUND;
    this.y = (Math.random() * 2 - 1) * config.BOUND;
    this.z = (Math.random() * 2 - 1) * config.BOUND;
    
    // Velocity
    this.vx = (Math.random() * 2 - 1) * config.PARTICLE_SPEED;
    this.vy = (Math.random() * 2 - 1) * config.PARTICLE_SPEED;
    this.vz = (Math.random() * 2 - 1) * config.PARTICLE_SPEED;
    
    // Base velocity (used for resetting)
    this.baseVy = this.vy;
    
    // Rendering properties
    this.size = config.PARTICLE_SIZE;
    this.opacity = 1;
    this.screen = null; // Projected screen coordinates
    
    // For shape transitions
    this.targetX = null;
    this.targetY = null;
    this.targetZ = null;
    this.originalX = this.x;
    this.originalY = this.y;
    this.originalZ = this.z;
    this.inTransition = false;
    
    // Previous position (for collision detection)
    this.prevX = this.x;
    this.prevY = this.y;
    this.prevZ = this.z;
  }
  
  /**
   * Update particle position and check boundaries
   * @param {number} globalVelocityY - Global Y velocity to apply
   * @param {Object} config - Configuration object
   * @param {Object|null} currentShape - Current shape with potential exclusion zones
   */
  update(globalVelocityY, config, currentShape = null) {
    // If in transition, don't apply normal movement
    if (this.inTransition) return;
    
    // Store previous position
    this.prevX = this.x;
    this.prevY = this.y;
    this.prevZ = this.z;
    
    // Calculate new position
    const newX = this.x + this.vx;
    const newY = this.y + this.vy + globalVelocityY;
    const newZ = this.z + this.vz;
    
    // Check if new position would be inside an exclusion zone
    if (currentShape && currentShape.hasExclusionZone) {
      const wouldEnterExclusionZone = this.wouldEnterExclusionZone(
        newX, newY, newZ, 
        currentShape.exclusionZone
      );
      
      if (wouldEnterExclusionZone) {
        // Bounce off the exclusion zone
        this.bounceOffExclusionZone(currentShape.exclusionZone);
        return;
      }
    }
    
    // Update position if not entering exclusion zone
    this.x = newX;
    this.y = newY;
    this.z = newZ;
    
    // Check if particle has moved beyond bounds
    this.checkBounds(config);
  }
  
  /**
   * Check if the particle would enter an exclusion zone at the new position
   * @param {number} newX - New X position
   * @param {number} newY - New Y position
   * @param {number} newZ - New Z position
   * @param {ExclusionZone} exclusionZone - Exclusion zone to check against
   * @returns {boolean} - True if the particle would enter the exclusion zone
   */
  wouldEnterExclusionZone(newX, newY, newZ, exclusionZone) {
    // Check if new position is inside exclusion zone
    const newPosition = { x: newX, y: newY, z: newZ };
    
    // If the particle is already inside, don't consider it as "entering"
    const currentPosition = { x: this.x, y: this.y, z: this.z };
    const currentlyInside = exclusionZone.contains(currentPosition);
    
    if (currentlyInside) {
      return false;
    }
    
    // Check if new position would be inside
    return exclusionZone.contains(newPosition);
  }
  
  /**
   * Calculate bounce direction when hitting an exclusion zone
   * @param {ExclusionZone} exclusionZone - Exclusion zone to bounce off of
   */
  bounceOffExclusionZone(exclusionZone) {
    // Calculate normal vector from exclusion zone center to particle
    let normalX, normalY, normalZ;
    
    switch (exclusionZone.type) {
      case 'sphere':
        // For sphere, normal is from center to particle
        normalX = this.x - exclusionZone.params.x;
        normalY = this.y - exclusionZone.params.y;
        normalZ = this.z - exclusionZone.params.z;
        break;
        
      case 'cylinder':
        // For cylinder, normal depends on axis
        const { x, y, z, axis } = exclusionZone.params;
        
        switch (axis) {
          case 'x':
            // Normal is in YZ plane
            normalX = 0;
            normalY = this.y - y;
            normalZ = this.z - z;
            break;
          case 'y':
            // Normal is in XZ plane
            normalX = this.x - x;
            normalY = 0;
            normalZ = this.z - z;
            break;
          case 'z':
          default:
            // Normal is in XY plane
            normalX = this.x - x;
            normalY = this.y - y;
            normalZ = 0;
            break;
        }
        break;
        
      case 'box':
      default:
        // For box, use the closest face normal
        const { x: boxX, y: boxY, z: boxZ, width, height, depth } = exclusionZone.params;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const halfDepth = depth / 2;
        
        // Calculate distances to each face
        const distToRight = Math.abs((boxX + halfWidth) - this.x);
        const distToLeft = Math.abs(this.x - (boxX - halfWidth));
        const distToTop = Math.abs((boxY + halfHeight) - this.y);
        const distToBottom = Math.abs(this.y - (boxY - halfHeight));
        const distToFront = Math.abs((boxZ + halfDepth) - this.z);
        const distToBack = Math.abs(this.z - (boxZ - halfDepth));
        
        // Find closest face
        const minDist = Math.min(
          distToRight, distToLeft, 
          distToTop, distToBottom, 
          distToFront, distToBack
        );
        
        // Set normal based on closest face
        normalX = 0;
        normalY = 0;
        normalZ = 0;
        
        if (minDist === distToRight) normalX = 1;
        else if (minDist === distToLeft) normalX = -1;
        else if (minDist === distToTop) normalY = 1;
        else if (minDist === distToBottom) normalY = -1;
        else if (minDist === distToFront) normalZ = 1;
        else if (minDist === distToBack) normalZ = -1;
        break;
    }
    
    // Normalize the normal vector
    const length = Math.sqrt(normalX*normalX + normalY*normalY + normalZ*normalZ);
    if (length > 0) {
      normalX /= length;
      normalY /= length;
      normalZ /= length;
    }
    
    // Calculate dot product of velocity and normal
    const dotProduct = this.vx * normalX + this.vy * normalY + this.vz * normalZ;
    
    // Calculate reflection vector: v' = v - 2(v·n)n
    this.vx = this.vx - 2 * dotProduct * normalX;
    this.vy = this.vy - 2 * dotProduct * normalY;
    this.vz = this.vz - 2 * dotProduct * normalZ;
    
    // Add a small push away from the exclusion zone to prevent sticking
    this.x = this.prevX + this.vx * 0.1;
    this.y = this.prevY + this.vy * 0.1;
    this.z = this.prevZ + this.vz * 0.1;
  }
  
  /**
   * Check if particle is out of bounds and reset if necessary
   * @param {Object} config - Configuration object
   */
  checkBounds(config) {
    const outOfBounds = Math.abs(this.x) > config.BOUND || 
                        Math.abs(this.y) > config.BOUND || 
                        Math.abs(this.z) > config.BOUND;
    
    if (outOfBounds) {
      const axis = Math.floor(Math.random() * 3); // 0 = x, 1 = y, 2 = z
      const sign = Math.random() < 0.5 ? -1 : 1;
      
      // Reset particle with new position and velocity
      this.resetParticle(config);
      
      // Place on the chosen boundary with random positions for the other two axes
      switch(axis) {
        case 0: // x-axis
          this.x = sign * config.BOUND;
          this.y = (Math.random() * 2 - 1) * config.BOUND;
          this.z = (Math.random() * 2 - 1) * config.BOUND;
          this.vx = -sign * Math.abs(this.vx); // Ensure velocity points inward
          break;
        case 1: // y-axis
          this.x = (Math.random() * 2 - 1) * config.BOUND;
          this.y = sign * config.BOUND;
          this.z = (Math.random() * 2 - 1) * config.BOUND;
          this.vy = -sign * Math.abs(this.vy);
          this.baseVy = this.vy; // Store the new base vertical velocity
          break;
        case 2: // z-axis
          this.x = (Math.random() * 2 - 1) * config.BOUND;
          this.y = (Math.random() * 2 - 1) * config.BOUND;
          this.z = sign * config.BOUND;
          this.vz = -sign * Math.abs(this.vz);
          break;
      }
    }
  }
  
  /**
   * Reset particle with new random properties
   * @param {Object} config - Configuration object
   */
  resetParticle(config) {
    // New random velocities
    this.vx = (Math.random() * 2 - 1) * config.PARTICLE_SPEED;
    this.vy = (Math.random() * 2 - 1) * config.PARTICLE_SPEED;
    this.vz = (Math.random() * 2 - 1) * config.PARTICLE_SPEED;
    this.baseVy = this.vy;
  }
  
  /**
   * Set target position for shape transition
   * @param {number} x - Target X coordinate
   * @param {number} y - Target Y coordinate
   * @param {number} z - Target Z coordinate
   */
  setTarget(x, y, z) {
    this.targetX = x;
    this.targetY = y;
    this.targetZ = z;
    this.originalX = this.x;
    this.originalY = this.y;
    this.originalZ = this.z;
    this.inTransition = true;
  }
  
  /**
   * Update position during transition
   * @param {number} progress - Transition progress from 0 to 1
   * @param {Function} easingFunction - Function to apply easing
   */
  updateTransition(progress, easingFunction) {
    if (!this.inTransition) return;
    
    const eased = easingFunction(progress);
    
    // Store previous position to calculate velocity vector
    const prevX = this.x;
    const prevY = this.y;
    const prevZ = this.z;
    
    // Interpolate between original and target positions
    this.x = this.originalX + (this.targetX - this.originalX) * eased;
    this.y = this.originalY + (this.targetY - this.originalY) * eased;
    this.z = this.originalZ + (this.targetZ - this.originalZ) * eased;
    
    // If transition is complete, update flags and inherit velocity from transition
    if (progress >= 1) {
      // Calculate direction vector from the last frame of animation
      const dx = this.x - prevX;
      const dy = this.y - prevY;
      const dz = this.z - prevZ;
      
      // Normalize the direction vector
      const length = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (length > 0) {
        // Get the current speed (magnitude of velocity)
        const currentSpeed = Math.sqrt(this.vx*this.vx + this.vy*this.vy + this.vz*this.vz);
        
        // Apply the direction with the original speed
        this.vx = (dx / length) * currentSpeed;
        this.vy = (dy / length) * currentSpeed;
        this.vz = (dz / length) * currentSpeed;
        this.baseVy = this.vy;
      }
      
      this.originalX = this.x;
      this.originalY = this.y;
      this.originalZ = this.z;
      this.inTransition = false;
    }
  }
  
  /**
   * Reset to random position
   * @param {Object} config - Configuration object
   */
  resetToRandom(config) {
    this.x = (Math.random() * 2 - 1) * config.BOUND;
    this.y = (Math.random() * 2 - 1) * config.BOUND;
    this.z = (Math.random() * 2 - 1) * config.BOUND;
    this.resetParticle(config);
    this.inTransition = false;
  }
}

// Export for module usage

export default Particle;