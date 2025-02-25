/**
 * Particle3DMesh - Main class for managing the 3D particle mesh system
 * This class coordinates all components of the particle system including
 * particles, camera, renderer, shapes, and animations.
 */

class Particle3DMesh {
  /**
   * Create a new Particle3DMesh instance
   * @param {string} canvasId - The ID of the canvas element to render to
   * @param {Object} customConfig - Custom configuration options to override defaults
   */
  constructor(canvasId, customConfig = {}) {
    // Initialize canvas and context
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // Set up configuration
    this.config = new Config(customConfig);
    
    // Initialize state variables
    this.particles = [];
    this.globalVelocityY = 0;
    this.scrollVelocity = 0;
    this.smoothedScrollVelocity = 0;
    this.velocityDecay = 0.98;
    this.velocitySmoothingFactor = 0.1;
    this.isRunning = false;
    this.animationFrameId = null;
    
    // Create component instances
    this.camera = new Camera(this.config);
    this.renderer = new Renderer(this.canvas, this.ctx, this.config);
    this.shapeManager = new ShapeManager(this.config);
    this.animationController = new AnimationController(this.config);
    
    // Initialize spatial grid for efficient connection checks
    this.spatialGrid = new SpatialGrid(this.config.GRID_CELL_SIZE, this.config.BOUND);
    
    // Current and target shapes
    this.currentShape = null;
    this.targetShape = null;
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize particles
    this.initParticles();
    
    // Auto-resize canvas
    this.resizeCanvas();
  }
  
  /**
   * Initialize particles based on configuration
   */
  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.config.PARTICLE_COUNT; i++) {
      this.particles.push(new Particle(this.config));
    }
  }
  
  /**
   * Set up event listeners for scroll and resize
   */
  setupEventListeners() {
    // Scroll event for particle velocity
    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.globalVelocityY -= e.deltaY * this.config.SCROLL_VELOCITY_FACTOR;
      this.scrollVelocity = Math.abs(e.deltaY) * 0.01;
    }, { passive: false });
    
    // Resize event for canvas
    window.addEventListener('resize', () => this.resizeCanvas());
  }
  
  /**
   * Resize canvas to match window dimensions
   */
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  /**
   * Start the animation loop
   */
  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.animate();
    }
    return this;
  }
  
  /**
   * Stop the animation loop
   */
  stop() {
    if (this.isRunning) {
      this.isRunning = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
    return this;
  }
  
  /**
   * Main animation loop
   */
  animate() {
    if (!this.isRunning) return;
    
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    
    // Update velocities
    this.updateVelocities();
    
    // Update camera position
    this.camera.update();
    
    // Clear the canvas
    this.renderer.clear();
    
    // Update animation transitions if active
    this.animationController.updateTransition(this.particles);
    
    // Update particle positions
    this.updateParticles();
    
    // Update spatial grid with new particle positions
    this.updateSpatialGrid();
    
    // Project particles to screen coordinates
    this.projectParticles();
    
    // Draw connections between particles
    this.drawConnections();
    
    // Draw particles
    this.drawParticles();
    
    // Call custom draw function if defined
    if (this.customDrawFunction) {
      this.customDrawFunction();
    }
  }
  
  /**
   * Update velocity values with smoothing and decay
   */
  updateVelocities() {
    // Smooth out the scroll velocity changes
    this.smoothedScrollVelocity += (this.scrollVelocity - this.smoothedScrollVelocity) * this.velocitySmoothingFactor;
    
    // Apply decay to velocities
    this.scrollVelocity *= this.velocityDecay;
    this.globalVelocityY *= this.velocityDecay;
  }
  
  /**
   * Update positions of all particles
   */
  updateParticles() {
    this.particles.forEach(particle => {
      // Pass the current shape to the particle update method
      particle.update(this.globalVelocityY, this.config, this.currentShape);
    });
  }
  
  /**
   * Update the spatial grid with current particle positions
   */
  updateSpatialGrid() {
    this.spatialGrid.addParticles(this.particles);
  }
  
  /**
   * Project all particles to screen coordinates
   */
  projectParticles() {
    this.particles.forEach(particle => {
      particle.screen = this.camera.projectPoint(particle);
      
      // Calculate distance from camera to particle for fog effect
      const dx = particle.x - this.camera.position.x;
      const dy = particle.y - this.camera.position.y;
      const dz = particle.z - this.camera.position.z;
      const distanceToCamera = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      // Calculate fog factor (0 = fully visible, 1 = fully hidden)
      const fogFactor = Math.min(Math.max(
        (distanceToCamera - this.config.FOG_START) / 
        (this.config.FOG_END - this.config.FOG_START), 0), 1);
      
      particle.opacity = 1 - fogFactor;
    });
  }
  
  /**
   * Draw connections between nearby particles
   * Uses spatial grid for efficient proximity checks
   */
  drawConnections() {
    // For performance measurement
    const startTime = performance.now();
    let connectionChecks = 0;
    let connectionsDrawn = 0;
    
    // Process each particle
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      
      // Get the cell key for this particle
      const cellKey = this.spatialGrid.getCellKey(p1.x, p1.y, p1.z);
      
      // Get all particles in this cell and neighboring cells
      const neighborhoodParticles = this.spatialGrid.getParticlesInNeighborhood(cellKey);
      
      // Check connections with particles in the neighborhood
      for (let j = 0; j < neighborhoodParticles.length; j++) {
        const p2 = neighborhoodParticles[j];
        
        // Skip self-connections and duplicate checks
        if (p1 === p2 || this.particles.indexOf(p1) > this.particles.indexOf(p2)) {
          continue;
        }
        
        // Count connection checks
        connectionChecks++;
        
        // Compute 3D distance between particles
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        // Check if particles are close enough to connect
        if (distance < this.config.CONNECTION_DISTANCE) {
          // Check if connection crosses any exclusion zones
          if (this.currentShape && this.currentShape.hasExclusionZone) {
            if (this.currentShape.crossesExclusionZone(p1, p2)) {
              continue; // Skip this connection
            }
          }
          
          // Only draw the line if both particles are visible
          if (p1.screen && p2.screen) {
            this.renderer.drawConnection(p1, p2, this.camera, this.smoothedScrollVelocity);
            connectionsDrawn++;
          }
        }
      }
    }
    
    // Log performance metrics every 100 frames
    if (Math.random() < 0.01) { // ~1% of frames
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`Spatial Grid Performance:
        - Particles: ${this.particles.length}
        - Connection checks: ${connectionChecks} (vs ${this.particles.length * (this.particles.length - 1) / 2} in O(n²))
        - Connections drawn: ${connectionsDrawn}
        - Time: ${duration.toFixed(2)}ms`);
    }
  }
  
  /**
   * Draw all particles
   */
  drawParticles() {
    this.particles.forEach(particle => {
      if (particle.screen) {
        this.renderer.drawParticle(particle, this.camera, this.smoothedScrollVelocity);
      }
    });
  }
  
  /**
   * Set particles to a specific shape
   * @param {string} shapeName - Name of the shape to create
   * @param {Object} options - Options for the shape
   */
  setShape(shapeName, options = {}) {
    this.currentShape = this.shapeManager.createShape(shapeName, this.particles, options);
    
    // Apply camera preferences from the shape if enabled in config
    if (this.config.SHAPE_SPECIFIC_CAMERA) {
      this.camera.setShapeTarget(this.currentShape);
    }
    
    return this;
  }
  
  /**
   * Transition to a new shape
   * @param {string} shapeName - Name of the shape to transition to
   * @param {Object} options - Options for the shape
   * @param {number} duration - Duration of transition in milliseconds
   * @param {string} easing - Easing function to use
   * @param {Function} callback - Function to call when transition completes
   * @returns {Particle3DMesh} - This instance for chaining
   */
  transitionToShape(shapeName, options = {}, duration = 1000, easing = 'easeInOut', callback = null) {
    // Clear any existing exclusion zones from the current shape before transition
    if (this.currentShape && this.currentShape.hasExclusionZone) {
      // Temporarily remove the exclusion zone during transition
      const tempShape = { ...this.currentShape };
      tempShape.hasExclusionZone = false;
      tempShape.exclusionZone = null;
      this.currentShape = tempShape;
    }
    
    // Create the target shape
    this.targetShape = this.shapeManager.createShape(shapeName, this.particles, options);
    
    // Apply camera preferences from the shape if enabled in config
    if (this.config.SHAPE_SPECIFIC_CAMERA) {
      this.camera.setShapeTarget(this.targetShape);
    }
    
    // Start the transition
    this.animationController.startTransition(
      this.particles,
      this.targetShape,
      duration,
      easing,
      () => {
        // Update current shape when transition completes
        this.currentShape = this.targetShape;
        this.targetShape = null;
        
        // Call the callback if provided
        if (callback) callback();
      }
    );
    
    return this;
  }
  
  /**
   * Add a custom shape to the shape manager
   * @param {string} name - Name of the shape
   * @param {Function} shapeFunction - Function that generates the shape
   */
  registerShape(name, shapeFunction) {
    this.shapeManager.registerShape(name, shapeFunction);
    return this;
  }
  
  /**
   * Add a custom transition to the animation controller
   * @param {string} name - Name of the transition
   * @param {Function} transitionFunction - Function that handles the transition
   */
  registerTransition(name, transitionFunction) {
    this.animationController.registerTransition(name, transitionFunction);
    return this;
  }
  
  /**
   * Set a custom draw function to be called each frame
   * @param {Function} drawFunction - Custom drawing function
   */
  setCustomDrawFunction(drawFunction) {
    this.customDrawFunction = drawFunction;
    return this;
  }
}

// Export for browser usage
if (typeof window !== 'undefined') {
  window.Particle3DMesh = Particle3DMesh;
}
