/**
 * Renderer - Handles all drawing operations for the particle system
 * Manages canvas rendering, particle drawing, and visual effects
 */
class Renderer {
  /**
   * Create a new renderer
   * @param {HTMLCanvasElement} canvas - Canvas element to render to
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   * @param {Object} config - Configuration object
   */
  constructor(canvas, ctx, config) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.config = config;
  }
  
  /**
   * Clear the canvas
   */
  clear() {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = this.config.BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  /**
   * Draw a single particle with chromatic aberration effect
   * @param {Object} particle - Particle to draw
   * @param {Camera} camera - Camera for perspective calculations
   * @param {number} velocityFactor - Additional velocity factor for effects
   */
  drawParticle(particle, camera, velocityFactor) {
    if (!this.ctx || !particle.screen) return;
    
    const r = particle.size * particle.screen.scale;
    const screenR = camera.getScreenRightVector();
    
    // Calculate chromatic offset using inverse scale for distance
    const offset = this.calculateChromaticOffset(
      particle.screen.x,
      particle.screen.y,
      this.config.CHROMATIC_OFFSET,
      screenR,
      velocityFactor
    );
    
    // Enable shadow for glow effect
    this.ctx.shadowBlur = 8;
    
    // Draw red channel
    this.ctx.shadowColor = 'rgba(255,0,0,0.5)';
    this.ctx.fillStyle = `rgba(255,0,0,${particle.opacity * this.config.CHROMATIC_STRENGTH})`;
    this.ctx.beginPath();
    this.ctx.arc(particle.screen.x - offset.x, particle.screen.y - offset.y, r, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw blue channel
    this.ctx.shadowColor = 'rgba(0,255,255,0.5)';
    this.ctx.fillStyle = `rgba(0,255,255,${particle.opacity * this.config.CHROMATIC_STRENGTH})`;
    this.ctx.beginPath();
    this.ctx.arc(particle.screen.x + offset.x, particle.screen.y + offset.y, r, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw white center
    this.ctx.shadowColor = this.config.PARTICLE_COLOR;
    this.ctx.fillStyle = `rgba(255,255,255,${particle.opacity})`;
    this.ctx.beginPath();
    this.ctx.arc(particle.screen.x, particle.screen.y, r, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Disable shadow for performance
    this.ctx.shadowBlur = 0;
  }
  
  /**
   * Draw a connection between two particles with chromatic aberration
   * @param {Object} p1 - First particle
   * @param {Object} p2 - Second particle
   * @param {Camera} camera - Camera for perspective calculations
   * @param {number} velocityFactor - Additional velocity factor for effects
   */
  drawConnection(p1, p2, camera, velocityFactor) {
    if (!this.ctx || !p1.screen || !p2.screen) return;
    
    // Compute 3D distance between particles
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    const avgOpacity = (p1.opacity + p2.opacity) / 2;
    const connectionAlpha = (1 - distance / this.config.CONNECTION_DISTANCE) * avgOpacity;
    const screenR = camera.getScreenRightVector();
    
    // Calculate chromatic offset for each point based on distance
    const offset1 = this.calculateChromaticOffset(
      p1.screen.x,
      p1.screen.y,
      this.config.CHROMATIC_OFFSET,
      screenR,
      velocityFactor
    );
    
    const offset2 = this.calculateChromaticOffset(
      p2.screen.x,
      p2.screen.y,
      this.config.CHROMATIC_OFFSET,
      screenR,
      velocityFactor
    );
    
    // Draw cyan channel with perspective-correct offsets
    this.ctx.beginPath();
    this.ctx.strokeStyle = `rgba(0,255,255,${connectionAlpha * this.config.CHROMATIC_STRENGTH})`;
    this.ctx.moveTo(p1.screen.x + offset1.x, p1.screen.y + offset1.y);
    this.ctx.lineTo(p2.screen.x + offset2.x, p2.screen.y + offset2.y);
    this.ctx.stroke();
    
    // Draw red channel with perspective-correct offsets
    this.ctx.beginPath();
    this.ctx.strokeStyle = `rgba(255,0,0,${connectionAlpha * this.config.CHROMATIC_STRENGTH})`;
    this.ctx.moveTo(p1.screen.x - offset1.x, p1.screen.y - offset1.y);
    this.ctx.lineTo(p2.screen.x - offset2.x, p2.screen.y - offset2.y);
    this.ctx.stroke();
    
    // Draw the base white channel
    this.ctx.beginPath();
    this.ctx.strokeStyle = `rgba(255,255,255,${connectionAlpha})`;
    this.ctx.moveTo(p1.screen.x, p1.screen.y);
    this.ctx.lineTo(p2.screen.x, p2.screen.y);
    this.ctx.stroke();
  }
  
  /**
   * Calculate chromatic aberration offset based on position and velocity
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} baseOffset - Base offset amount
   * @param {Object} rightVector - Screen-space right vector
   * @param {number} velocityFactor - Additional velocity factor
   * @returns {Object} - X and Y offset values
   */
  calculateChromaticOffset(x, y, baseOffset, rightVector, velocityFactor) {
    // Round input coordinates to prevent micro-jitter
    x = Math.round(x);
    y = Math.round(y);
    
    // Calculate distance from center of screen
    const centerX = Math.round(this.canvas.width / 2);
    const centerY = Math.round(this.canvas.height / 2);
    const dx = x - centerX;
    const dy = y - centerY;
    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate offset based on distance and scroll velocity
    const distanceOffset = distanceFromCenter * this.config.CHROMATIC_DISTANCE_FACTOR;
    const velocityOffset = velocityFactor * this.config.CHROMATIC_VELOCITY_FACTOR;
    
    // Combine both factors and round to prevent jitter
    const totalOffset = Math.round(baseOffset * (1 + distanceOffset + velocityOffset) * 10) / 10;
    
    // Use camera's right vector for consistent left/right offset
    return {
      x: Math.round(rightVector.x * totalOffset * 10) / 10,
      y: Math.round(rightVector.y * totalOffset * 10) / 10
    };
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Renderer;
}
