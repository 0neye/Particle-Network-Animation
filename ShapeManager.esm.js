/**
 * ShapeManager - Manages particle shapes and formations
 * Handles creation of predefined shapes and custom shape registration
 */
class ShapeManager {
  /**
   * Create a new shape manager
   * @param {Object} config - Configuration object
   */
  constructor(config) {
    this.config = config;
    this.shapes = {};
    
    // Register built-in shapes
    this.registerBuiltInShapes();
  }
  
  /**
   * Register the built-in shape generators
   */
  registerBuiltInShapes() {
    // Register common shapes
    this.registerShape('random', this.createRandom.bind(this));
    this.registerShape('sphere', this.createSphere.bind(this));
    this.registerShape('iris', this.createIris.bind(this));
    this.registerShape('torus', this.createTorus.bind(this));
    this.registerShape('cube', this.createCube.bind(this));
    this.registerShape('plane', this.createPlane.bind(this));
    this.registerShape('spiral', this.createSpiral.bind(this));
  }
  
  /**
   * Register a new shape generator function
   * @param {string} name - Name of the shape
   * @param {Function} shapeFunction - Function that generates the shape
   */
  registerShape(name, shapeFunction) {
    this.shapes[name] = shapeFunction;
  }
  
  /**
   * Create a shape using the registered generator function
   * @param {string} name - Name of the shape to create
   * @param {Array} particles - Array of particles to position
   * @param {Object} options - Options for the shape
   * @returns {Object} - Shape object with particle positions and properties
   */
  createShape(name, particles, options = {}) {
    if (!this.shapes[name]) {
      console.error(`Shape "${name}" not found`);
      return null;
    }
    
    // Create the shape
    const shape = this.shapes[name](particles, options);
    
    return shape;
  }
  
  /**
   * Create a random distribution (default behavior)
   * @param {Array} particles - Array of particles to position
   * @param {Object} options - Options for the shape
   * @returns {Object} - Shape object
   */
  createRandom(particles, options = {}) {
    const bound = options.bound || this.config.BOUND;
    
    particles.forEach(particle => {
      particle.setTarget(
        (Math.random() * 2 - 1) * bound,
        (Math.random() * 2 - 1) * bound,
        (Math.random() * 2 - 1) * bound
      );
    });
    
    return {
      name: 'random',
      hasExclusionZone: false,
      crossesExclusionZone: () => false,
      cameraPreferences: {
        enabled: this.config.SHAPE_SPECIFIC_CAMERA && (options.restrictCamera || false),
        angle: options.cameraAngle,
        elevation: options.cameraElevation,
        distance: options.cameraDistance,
        lookAtPoint: options.lookAtPoint
      }
    };
  }
  
  /**
   * Create a sphere shape
   * @param {Array} particles - Array of particles to position
   * @param {Object} options - Options for the shape
   * @returns {Object} - Shape object
   */
  createSphere(particles, options = {}) {
    const radius = options.radius || this.config.BOUND / 2;
    const centerX = options.centerX || 0;
    const centerY = options.centerY || 0;
    const centerZ = options.centerZ || 0;
    
    particles.forEach((particle, index) => {
      // Use fibonacci sphere algorithm for even distribution
      const phi = Math.acos(1 - 2 * (index + 0.5) / particles.length);
      const theta = Math.PI * 2 * index * (1 / 1.618033988749895);
      
      const x = centerX + radius * Math.sin(phi) * Math.cos(theta);
      const y = centerY + radius * Math.sin(phi) * Math.sin(theta);
      const z = centerZ + radius * Math.cos(phi);
      
      particle.setTarget(x, y, z);
    });
    
    return {
      name: 'sphere',
      hasExclusionZone: false,
      crossesExclusionZone: () => false,
      cameraPreferences: {
        enabled: this.config.SHAPE_SPECIFIC_CAMERA && (options.restrictCamera || false),
        angle: options.cameraAngle,
        elevation: options.cameraElevation,
        distance: options.cameraDistance,
        lookAtPoint: options.lookAtPoint
      }
    };
  }
  
  /**
   * Create an iris shape with pupil exclusion zone
   * @param {Array} particles - Array of particles to position
   * @param {Object} options - Options for the shape
   * @returns {Object} - Shape object
   */
  createIris(particles, options = {}) {
    const radius = options.radius || this.config.BOUND / 2;
    const pupilRadius = options.pupilRadius || radius * 0.3;
    const depth = options.depth || radius * 0.2;
    const centerX = options.centerX || 0;
    const centerY = options.centerY || 0;
    const centerZ = options.centerZ || 0;
    
    // Create exclusion zone for pupil
    const exclusionZone = new ExclusionZone('cylinder', {
      x: centerX,
      y: centerY,
      z: centerZ,
      radius: pupilRadius,
      height: depth * 2,
      axis: 'z'
    });
    
    particles.forEach((particle, index) => {
      // Generate random angle and distance from center
      const angle = Math.random() * Math.PI * 2;
      let distance;
      
      // Ensure particles are not in the pupil
      do {
        // Bias toward outer edge for iris texture
        const r = Math.random();
        distance = pupilRadius + (radius - pupilRadius) * (r * r);
      } while (distance < pupilRadius);
      
      // Calculate position on iris plane
      const x = centerX + distance * Math.cos(angle);
      const y = centerY + distance * Math.sin(angle);
      
      // Add some depth variation
      const z = centerZ + (Math.random() * 2 - 1) * depth;
      
      particle.setTarget(x, y, z);
    });
    
    return {
      name: 'iris',
      hasExclusionZone: true,
      exclusionZone: exclusionZone,
      crossesExclusionZone: (p1, p2) => {
        // Check if line segment between particles crosses the pupil
        return this.lineIntersectsCylinder(
          p1.x, p1.y, p1.z,
          p2.x, p2.y, p2.z,
          centerX, centerY, centerZ,
          pupilRadius,
          depth * 2,
          'z'
        );
      },
      cameraPreferences: {
        enabled: this.config.SHAPE_SPECIFIC_CAMERA !== false, // Default to true for iris
        angle: options.cameraAngle || Math.PI / 2, // Rotate 90 degrees to look straight at the iris
        elevation: options.cameraElevation || 0, // Keep elevation at 0
        distance: options.cameraDistance || 600, // Default distance
        lookAtPoint: options.lookAtPoint || { x: 0, y: 0, z: 0 }, // Look at the center of the iris
        transitionSpeed: options.transitionSpeed || 0.05, // Smooth transition
        transitionDuration: options.transitionDuration || 800 // Longer transition for smoother effect
      }
    };
  }
  
  /**
   * Create a torus (donut) shape
   * @param {Array} particles - Array of particles to position
   * @param {Object} options - Options for the shape
   * @returns {Object} - Shape object
   */
  createTorus(particles, options = {}) {
    const majorRadius = options.majorRadius || this.config.BOUND / 2;
    const minorRadius = options.minorRadius || majorRadius / 4;
    const centerX = options.centerX || 0;
    const centerY = options.centerY || 0;
    const centerZ = options.centerZ || 0;
    
    particles.forEach((particle, index) => {
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * Math.PI * 2;
      
      const x = centerX + (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u);
      const y = centerY + (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u);
      const z = centerZ + minorRadius * Math.sin(v);
      
      particle.setTarget(x, y, z);
    });
    
    return {
      name: 'torus',
      hasExclusionZone: false,
      crossesExclusionZone: () => false,
      cameraPreferences: {
        enabled: this.config.SHAPE_SPECIFIC_CAMERA && (options.restrictCamera || false),
        angle: options.cameraAngle,
        elevation: options.cameraElevation,
        distance: options.cameraDistance,
        lookAtPoint: options.lookAtPoint
      }
    };
  }
  
  /**
   * Create a cube shape
   * @param {Array} particles - Array of particles to position
   * @param {Object} options - Options for the shape
   * @returns {Object} - Shape object
   */
  createCube(particles, options = {}) {
    const size = options.size || this.config.BOUND / 2;
    const centerX = options.centerX || 0;
    const centerY = options.centerY || 0;
    const centerZ = options.centerZ || 0;
    const hollow = options.hollow || false;
    
    particles.forEach((particle, index) => {
      let x, y, z;
      
      if (hollow) {
        // Place particles on the faces of the cube
        const face = Math.floor(Math.random() * 6);
        const u = Math.random() * 2 - 1;
        const v = Math.random() * 2 - 1;
        
        switch (face) {
          case 0: // Front face
            x = centerX + u * size;
            y = centerY + v * size;
            z = centerZ + size;
            break;
          case 1: // Back face
            x = centerX + u * size;
            y = centerY + v * size;
            z = centerZ - size;
            break;
          case 2: // Top face
            x = centerX + u * size;
            y = centerY + size;
            z = centerZ + v * size;
            break;
          case 3: // Bottom face
            x = centerX + u * size;
            y = centerY - size;
            z = centerZ + v * size;
            break;
          case 4: // Right face
            x = centerX + size;
            y = centerY + u * size;
            z = centerZ + v * size;
            break;
          case 5: // Left face
            x = centerX - size;
            y = centerY + u * size;
            z = centerZ + v * size;
            break;
        }
      } else {
        // Fill the entire cube volume
        x = centerX + (Math.random() * 2 - 1) * size;
        y = centerY + (Math.random() * 2 - 1) * size;
        z = centerZ + (Math.random() * 2 - 1) * size;
      }
      
      particle.setTarget(x, y, z);
    });
    
    return {
      name: 'cube',
      hasExclusionZone: false,
      crossesExclusionZone: () => false,
      cameraPreferences: {
        enabled: this.config.SHAPE_SPECIFIC_CAMERA && (options.restrictCamera || false),
        angle: options.cameraAngle,
        elevation: options.cameraElevation,
        distance: options.cameraDistance,
        lookAtPoint: options.lookAtPoint
      }
    };
  }
  
  /**
   * Create a flat plane of particles
   * @param {Array} particles - Array of particles to position
   * @param {Object} options - Options for the shape
   * @returns {Object} - Shape object
   */
  createPlane(particles, options = {}) {
    const width = options.width || this.config.BOUND;
    const height = options.height || this.config.BOUND;
    const centerX = options.centerX || 0;
    const centerY = options.centerY || 0;
    const centerZ = options.centerZ || 0;
    const orientation = options.orientation || 'xy'; // xy, xz, or yz
    
    particles.forEach((particle) => {
      let x, y, z;
      
      // Calculate position based on orientation
      const u = (Math.random() * 2 - 1) * width / 2;
      const v = (Math.random() * 2 - 1) * height / 2;
      
      switch (orientation) {
        case 'xy':
          x = centerX + u;
          y = centerY + v;
          z = centerZ;
          break;
        case 'xz':
          x = centerX + u;
          y = centerY;
          z = centerZ + v;
          break;
        case 'yz':
          x = centerX;
          y = centerY + u;
          z = centerZ + v;
          break;
      }
      
      particle.setTarget(x, y, z);
    });
    
    return {
      name: 'plane',
      hasExclusionZone: false,
      crossesExclusionZone: () => false,
      cameraPreferences: {
        enabled: this.config.SHAPE_SPECIFIC_CAMERA && (options.restrictCamera || false),
        angle: options.cameraAngle,
        elevation: options.cameraElevation,
        distance: options.cameraDistance,
        lookAtPoint: options.lookAtPoint
      }
    };
  }
  
  /**
   * Create a spiral shape
   * @param {Array} particles - Array of particles to position
   * @param {Object} options - Options for the shape
   * @returns {Object} - Shape object
   */
  createSpiral(particles, options = {}) {
    const radius = options.radius || this.config.BOUND / 2;
    const turns = options.turns || 3;
    const height = options.height || this.config.BOUND;
    const centerX = options.centerX || 0;
    const centerY = options.centerY || 0;
    const centerZ = options.centerZ || 0;
    
    particles.forEach((particle, index) => {
      // Position along the spiral (0 to 1)
      const t = index / particles.length;
      
      // Calculate spiral coordinates
      const angle = t * turns * Math.PI * 2;
      const r = radius * t;
      const h = (t * 2 - 1) * height / 2;
      
      const x = centerX + r * Math.cos(angle);
      const y = centerY + h;
      const z = centerZ + r * Math.sin(angle);
      
      particle.setTarget(x, y, z);
    });
    
    return {
      name: 'spiral',
      hasExclusionZone: false,
      crossesExclusionZone: () => false,
      cameraPreferences: {
        enabled: this.config.SHAPE_SPECIFIC_CAMERA && (options.restrictCamera || false),
        angle: options.cameraAngle,
        elevation: options.cameraElevation,
        distance: options.cameraDistance,
        lookAtPoint: options.lookAtPoint
      }
    };
  }
  
  /**
   * Check if a line segment intersects a cylinder
   * Used for exclusion zone calculations
   * @param {number} x1 - First point x
   * @param {number} y1 - First point y
   * @param {number} z1 - First point z
   * @param {number} x2 - Second point x
   * @param {number} y2 - Second point y
   * @param {number} z2 - Second point z
   * @param {number} cx - Cylinder center x
   * @param {number} cy - Cylinder center y
   * @param {number} cz - Cylinder center z
   * @param {number} r - Cylinder radius
   * @param {number} h - Cylinder height
   * @param {string} axis - Cylinder axis ('x', 'y', or 'z')
   * @returns {boolean} - True if line intersects cylinder
   */
  lineIntersectsCylinder(x1, y1, z1, x2, y2, z2, cx, cy, cz, r, h, axis) {
    // Transform points to cylinder-local coordinates
    const p1 = { x: x1 - cx, y: y1 - cy, z: z1 - cz };
    const p2 = { x: x2 - cx, y: y2 - cy, z: z2 - cz };
    
    // Line direction vector
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    
    // Variables for cylinder test based on axis
    let a, b, c, d, e;
    let axisValue1, axisValue2;
    
    switch (axis) {
      case 'x':
        a = dy * dy + dz * dz;
        b = 2 * (p1.y * dy + p1.z * dz);
        c = p1.y * p1.y + p1.z * p1.z - r * r;
        axisValue1 = p1.x;
        axisValue2 = p2.x;
        break;
      case 'y':
        a = dx * dx + dz * dz;
        b = 2 * (p1.x * dx + p1.z * dz);
        c = p1.x * p1.x + p1.z * p1.z - r * r;
        axisValue1 = p1.y;
        axisValue2 = p2.y;
        break;
      case 'z':
      default:
        a = dx * dx + dy * dy;
        b = 2 * (p1.x * dx + p1.y * dy);
        c = p1.x * p1.x + p1.y * p1.y - r * r;
        axisValue1 = p1.z;
        axisValue2 = p2.z;
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
    const halfHeight = h / 2;
    
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
}

// Export for module usage

export default ShapeManager;