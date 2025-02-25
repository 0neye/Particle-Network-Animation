/**
 * Camera - Handles camera positioning and 3D to 2D projection
 * Manages camera movement and calculates projection matrices
 */
class Camera {
  /**
   * Create a new camera
   * @param {Object} config - Configuration object
   */
  constructor(config) {
    this.config = config;
    
    // Camera position and orientation
    this.angle = 0;
    this.elevation = 0;
    this.position = { x: 0, y: 0, z: 0 };
    this.forward = { x: 0, y: 0, z: 0 };
    this.right = { x: 0, y: 0, z: 0 };
    this.up = { x: 0, y: 0, z: 0 };
    
    // For smooth camera movement
    this.startTime = Date.now();
    this.lastAngle = 0;
    this.angularVelocity = 0;
    
    // For shape-specific camera angles
    this.targetAngle = null;
    this.targetElevation = null;
    this.targetDistance = null;
    this.targetLookAt = null;
    this.transitionSpeed = 0.05;
    this.restrictToShape = false;
    
    // For smooth transitions
    this.currentDistance = this.config.CAMERA_DISTANCE;
    this.isTransitioning = false;
    this.transitionStartTime = 0;
    this.transitionDuration = 500; // ms
    this.transitionStartPosition = null;
    this.transitionStartAngle = null;
    this.transitionStartElevation = null;
    this.transitionStartDistance = null;
  }
  
  /**
   * Update camera position and orientation
   */
  update() {
    const currentTime = Date.now();
    
    if (this.restrictToShape && this.targetAngle !== null) {
      // Handle smooth transition when first entering restricted mode
      if (this.isTransitioning) {
        const elapsed = currentTime - this.transitionStartTime;
        const progress = Math.min(elapsed / this.transitionDuration, 1);
        
        // Use easing function for smoother transition
        const easedProgress = this.easeInOutCubic(progress);
        
        if (progress < 1) {
          // Interpolate between start and target values
          this.angle = this.transitionStartAngle + (this.targetAngle - this.transitionStartAngle) * easedProgress;
          this.elevation = this.transitionStartElevation + (this.targetElevation - this.transitionStartElevation) * easedProgress;
          this.currentDistance = this.transitionStartDistance + 
            ((this.targetDistance !== null ? this.targetDistance : this.config.CAMERA_DISTANCE) - this.transitionStartDistance) * easedProgress;
        } else {
          // Transition complete
          this.isTransitioning = false;
        }
      } else {
        // Regular smooth movement towards target
        this.angle += (this.targetAngle - this.angle) * this.transitionSpeed;
        this.elevation += (this.targetElevation - this.elevation) * this.transitionSpeed;
        this.currentDistance += ((this.targetDistance !== null ? this.targetDistance : this.config.CAMERA_DISTANCE) - this.currentDistance) * this.transitionSpeed;
      }
      
      // Calculate angular velocity for effects
      this.angularVelocity = this.angle - this.lastAngle;
      this.lastAngle = this.angle;
      
      // Calculate camera position
      const horizontalRadius = this.currentDistance * Math.cos(this.elevation);
      this.position.x = horizontalRadius * Math.cos(this.angle);
      this.position.y = this.currentDistance * Math.sin(this.elevation);
      this.position.z = horizontalRadius * Math.sin(this.angle);
    } else {
      const time = currentTime - this.startTime;
      const cycle = (time % this.config.ROTATION_PERIOD) / this.config.ROTATION_PERIOD;
      
      // Smooth horizontal rotation
      this.angle += this.config.AUTO_ROTATION_SPEED;
      
      // Smooth multi-directional changes using sine waves
      this.elevation = Math.sin(cycle * Math.PI * 2) * 0.3;
      const horizontalOffset = Math.sin(cycle * Math.PI * 2) * 0.002;
      
      // Apply smooth horizontal offset to camera angle
      this.angle += horizontalOffset;
      
      // Calculate angular velocity for effects
      this.angularVelocity = this.angle - this.lastAngle;
      this.lastAngle = this.angle;
      
      // Smoothly adjust distance
      this.currentDistance += (this.config.CAMERA_DISTANCE - this.currentDistance) * this.transitionSpeed;
      
      // Calculate camera position
      const horizontalRadius = this.currentDistance * Math.cos(this.elevation);
      this.position.x = horizontalRadius * Math.cos(this.angle);
      this.position.y = this.currentDistance * Math.sin(this.elevation);
      this.position.z = horizontalRadius * Math.sin(this.angle);
    }
    
    // Calculate normalized direction from camera to origin or target look-at point
    const lookAtPoint = this.targetLookAt || { x: 0, y: 0, z: 0 };
    const dx = lookAtPoint.x - this.position.x;
    const dy = lookAtPoint.y - this.position.y;
    const dz = lookAtPoint.z - this.position.z;
    
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    this.forward = { 
      x: dx / length,
      y: dy / length,
      z: dz / length
    };
    
    // Right vector: cross product of world-up and Forward
    const worldUp = { x: 0, y: 1, z: 0 };
    this.right = {
      x: this.forward.z * worldUp.y - this.forward.y * worldUp.z,
      y: this.forward.x * worldUp.z - this.forward.z * worldUp.x,
      z: this.forward.y * worldUp.x - this.forward.x * worldUp.y
    };
    
    // Normalize right vector
    const rightLength = Math.sqrt(
      this.right.x * this.right.x + 
      this.right.y * this.right.y + 
      this.right.z * this.right.z
    );
    
    this.right = {
      x: this.right.x / rightLength,
      y: this.right.y / rightLength,
      z: this.right.z / rightLength
    };
    
    // Up vector: cross product of Forward and Right
    this.up = {
      x: this.forward.z * this.right.y - this.forward.y * this.right.z,
      y: this.forward.x * this.right.z - this.forward.z * this.right.x,
      z: this.forward.y * this.right.x - this.forward.x * this.right.y
    };
  }
  
  /**
   * Easing function for smooth transitions
   * @param {number} t - Progress value between 0 and 1
   * @returns {number} - Eased value
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  /**
   * Set camera target based on shape preferences
   * @param {Object} shape - Shape object with camera preferences
   */
  setShapeTarget(shape) {
    if (shape && shape.cameraPreferences && shape.cameraPreferences.enabled) {
      const prefs = shape.cameraPreferences;
      
      // Store current values for smooth transition
      this.transitionStartAngle = this.angle;
      this.transitionStartElevation = this.elevation;
      this.transitionStartDistance = this.currentDistance;
      this.transitionStartTime = Date.now();
      this.isTransitioning = true;
      
      // Set target values
      this.targetAngle = prefs.angle !== undefined ? prefs.angle : this.angle;
      this.targetElevation = prefs.elevation !== undefined ? prefs.elevation : this.elevation;
      this.targetDistance = prefs.distance !== undefined ? prefs.distance : this.config.CAMERA_DISTANCE;
      this.targetLookAt = prefs.lookAtPoint || { x: 0, y: 0, z: 0 };
      this.transitionSpeed = prefs.transitionSpeed || 0.05;
      this.transitionDuration = prefs.transitionDuration || 500;
      this.restrictToShape = true;
    } else {
      // If transitioning from restricted to free, store current values for smooth transition
      if (this.restrictToShape) {
        this.transitionStartAngle = this.angle;
        this.transitionStartElevation = this.elevation;
        this.transitionStartDistance = this.currentDistance;
        this.transitionStartTime = Date.now();
        this.isTransitioning = true;
      }
      
      this.restrictToShape = false;
      this.targetAngle = null;
      this.targetElevation = null;
      this.targetDistance = null;
      this.targetLookAt = null;
    }
  }
  
  /**
   * Reset camera to free movement mode
   */
  resetToFreeMode() {
    // Store current values for smooth transition
    this.transitionStartAngle = this.angle;
    this.transitionStartElevation = this.elevation;
    this.transitionStartDistance = this.currentDistance;
    this.transitionStartTime = Date.now();
    this.isTransitioning = true;
    
    this.restrictToShape = false;
    this.targetAngle = null;
    this.targetElevation = null;
    this.targetDistance = null;
    this.targetLookAt = null;
  }
  
  /**
   * Project a 3D point to 2D screen coordinates
   * @param {Object} point - 3D point with x, y, z coordinates
   * @returns {Object|null} - Screen coordinates or null if behind camera
   */
  projectPoint(point) {
    const dx = point.x - this.position.x;
    const dy = point.y - this.position.y;
    const dz = point.z - this.position.z;
    
    // Camera-space coordinates:
    const x_cam = dx * this.right.x + dy * this.right.y + dz * this.right.z;
    const y_cam = dx * this.up.x + dy * this.up.y + dz * this.up.z;
    const z_cam = dx * this.forward.x + dy * this.forward.y + dz * this.forward.z;
    
    if (z_cam <= 0) return null; // Behind the camera; skip drawing.
    
    const canvas = document.querySelector('canvas'); // Get canvas (this could be passed in)
    const scale = this.config.FOCAL_LENGTH / z_cam;
    
    return {
      x: canvas.width / 2 + x_cam * scale,
      y: canvas.height / 2 - y_cam * scale,
      scale: scale, // Use this to optionally scale particle size.
      z_cam: z_cam
    };
  }
  
  /**
   * Get the screen-space right vector for chromatic aberration
   * @returns {Object} - Normalized screen-space right vector
   */
  getScreenRightVector() {
    const length = Math.sqrt(
      this.position.x * this.position.x + 
      this.position.y * this.position.y + 
      this.position.z * this.position.z
    );
    
    // Project right vector to screen space
    const screenR = {
      x: this.right.x * this.config.FOCAL_LENGTH / length,
      y: this.right.y * this.config.FOCAL_LENGTH / length
    };
    
    // Normalize screen right vector
    const screenRLength = Math.sqrt(screenR.x * screenR.x + screenR.y * screenR.y);
    
    return {
      x: screenR.x / screenRLength,
      y: screenR.y / screenRLength
    };
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Camera;
}
