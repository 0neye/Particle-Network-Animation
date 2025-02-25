/**
 * AnimationController - Manages transitions between particle shapes
 * Handles easing functions and animation timing
 */
class AnimationController {
  /**
   * Create a new animation controller
   * @param {Object} config - Configuration object
   */
  constructor(config) {
    this.config = config;
    this.transitions = {};
    
    // Transition state
    this.isTransitioning = false;
    this.transitionStartTime = 0;
    this.transitionDuration = 0;
    this.onTransitionComplete = null;
    
    // Register built-in transitions
    this.registerBuiltInTransitions();
  }
  
  /**
   * Register the built-in transition functions
   */
  registerBuiltInTransitions() {
    this.registerTransition('linear', this.linearTransition.bind(this));
    this.registerTransition('easeInOut', this.easeInOutTransition.bind(this));
    this.registerTransition('easeIn', this.easeInTransition.bind(this));
    this.registerTransition('easeOut', this.easeOutTransition.bind(this));
    this.registerTransition('spring', this.springTransition.bind(this));
    this.registerTransition('bounce', this.bounceTransition.bind(this));
    this.registerTransition('elastic', this.elasticTransition.bind(this));
  }
  
  /**
   * Register a new transition function
   * @param {string} name - Name of the transition
   * @param {Function} transitionFunction - Function that handles the transition
   */
  registerTransition(name, transitionFunction) {
    this.transitions[name] = transitionFunction;
  }
  
  /**
   * Start a transition between shapes
   * @param {Array} particles - Array of particles to animate
   * @param {Object} targetShape - Target shape to transition to
   * @param {number} duration - Duration of transition in milliseconds
   * @param {string} type - Type of transition (easing function)
   * @param {Function} callback - Function to call when transition completes
   */
  startTransition(particles, targetShape, duration = 1000, type = 'easeInOut', callback = null) {
    // Set transition state
    this.isTransitioning = true;
    this.transitionStartTime = Date.now();
    this.transitionDuration = duration;
    this.onTransitionComplete = callback;
    
    // Get the easing function
    const easingFunction = this.transitions[type] || this.transitions.easeInOut;
    
    // Store the transition data for each particle
    this.particles = particles;
    this.easingFunction = easingFunction;
  }
  
  /**
   * Update transition progress
   * @param {Array} particles - Array of particles to update
   * @returns {boolean} - True if transition is still in progress
   */
  updateTransition(particles) {
    if (!this.isTransitioning) return false;
    
    // Calculate progress (0 to 1)
    const elapsed = Date.now() - this.transitionStartTime;
    const progress = Math.min(elapsed / this.transitionDuration, 1);
    
    // Update each particle's position
    particles.forEach(particle => {
      particle.updateTransition(progress, this.easingFunction);
    });
    
    // Check if transition is complete
    if (progress >= 1) {
      this.isTransitioning = false;
      
      // Call the completion callback if provided
      if (this.onTransitionComplete) {
        this.onTransitionComplete();
      }
    }
    
    return this.isTransitioning;
  }
  
  /**
   * Linear transition (no easing)
   * @param {number} t - Progress from 0 to 1
   * @returns {number} - Eased value
   */
  linearTransition(t) {
    return t;
  }
  
  /**
   * Ease-in-out transition (slow start, fast middle, slow end)
   * @param {number} t - Progress from 0 to 1
   * @returns {number} - Eased value
   */
  easeInOutTransition(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  
  /**
   * Ease-in transition (slow start, fast end)
   * @param {number} t - Progress from 0 to 1
   * @returns {number} - Eased value
   */
  easeInTransition(t) {
    return t * t;
  }
  
  /**
   * Ease-out transition (fast start, slow end)
   * @param {number} t - Progress from 0 to 1
   * @returns {number} - Eased value
   */
  easeOutTransition(t) {
    return 1 - (1 - t) * (1 - t);
  }
  
  /**
   * Spring transition (overshoot and settle)
   * @param {number} t - Progress from 0 to 1
   * @returns {number} - Eased value
   */
  springTransition(t) {
    const s = 1.70158 * 1.525;
    
    if (t < 0.5) {
      return (2 * t) * (2 * t) * ((s + 1) * 2 * t - s) / 2;
    } else {
      return (2 * t - 2) * (2 * t - 2) * ((s + 1) * (t * 2 - 2) + s) / 2 + 1;
    }
  }
  
  /**
   * Bounce transition (bounce at the end)
   * @param {number} t - Progress from 0 to 1
   * @returns {number} - Eased value
   */
  bounceTransition(t) {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }
  
  /**
   * Elastic transition (spring with more oscillation)
   * @param {number} t - Progress from 0 to 1
   * @returns {number} - Eased value
   */
  elasticTransition(t) {
    if (t === 0 || t === 1) return t;
    
    const p = 0.3;
    const s = p / 4;
    
    return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimationController;
}
