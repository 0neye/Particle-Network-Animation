/**
 * Config - Manages configuration settings for the particle system
 * Provides default values and merges with custom settings
 */
class Config {
  /**
   * Create a new configuration object
   * @param {Object} customConfig - Custom configuration options
   * @returns {Object} - Merged configuration object
   */
  constructor(customConfig = {}) {
    // Default configuration
    this.defaults = {
      // Particle parameters
      PARTICLE_COUNT: 300,
      PARTICLE_SIZE: 3,         // Base size of each particle
      PARTICLE_SPEED: 0.5,      // Maximum absolute speed in any direction
      BOUND: 800,               // Particles exist within a cube from -BOUND to +BOUND
      CONNECTION_DISTANCE: 300, // If two particles are closer than this (in world units), draw a connection
      SCROLL_VELOCITY_FACTOR: 0.01, // How much scrolling affects particle velocity
      
      // Camera and projection
      CAMERA_DISTANCE: 500,     // Distance of the camera from (0,0,0)
      FOCAL_LENGTH: 800,        // Focal length for perspective projection
      FOG_START: 500,           // Distance at which fog starts
      FOG_END: 1000,            // Distance at which fog is fully opaque
      AUTO_ROTATION_SPEED: 0.0005, // Base speed for automatic rotation
      ROTATION_PERIOD: 10000,   // Time for a full rotation cycle in ms
      SHAPE_SPECIFIC_CAMERA: true, // Whether to use shape-specific camera angles
      
      // Colors and effects
      BACKGROUND_COLOR: '#111',
      PARTICLE_COLOR: '#fff',
      CHROMATIC_OFFSET: 1,      // Base pixel offset for chromatic aberration
      CHROMATIC_STRENGTH: 0.6,  // Base opacity of the chromatic effect (0-1)
      CHROMATIC_DISTANCE_FACTOR: 0.005, // How much distance affects chromatic aberration
      CHROMATIC_VELOCITY_FACTOR: 5,  // How much camera velocity affects chromatic aberration
      
      // Animation settings
      DEFAULT_TRANSITION_DURATION: 1000, // Default duration for shape transitions in ms
      DEFAULT_TRANSITION_TYPE: 'easeInOut', // Default easing function for transitions
      
      // Shape settings
      DEFAULT_SHAPE: 'random',  // Default shape to use
      
      // Advanced settings
      VELOCITY_DECAY: 0.98,     // Rate at which velocities decay
      VELOCITY_SMOOTHING: 0.1   // Smoothing factor for velocity changes
    };
    
    // Merge custom config with defaults
    return this.merge(customConfig);
  }
  
  /**
   * Merge custom configuration with defaults
   * @param {Object} customConfig - Custom configuration options
   * @returns {Object} - Merged configuration object
   */
  merge(customConfig) {
    // Create a new object with defaults
    const merged = { ...this.defaults };
    
    // Merge in custom values
    for (const key in customConfig) {
      if (customConfig.hasOwnProperty(key)) {
        merged[key] = customConfig[key];
      }
    }
    
    return merged;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Config;
}
