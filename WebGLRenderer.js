class WebGLRenderer {
    /**
     * Create a new WebGLRenderer.
     * @param {HTMLCanvasElement} canvas - The canvas element.
     * @param {Object} config - The configuration object.
     */
    constructor(canvas, config) {
      this.canvas = canvas;
      this.config = config;
      this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!this.gl) {
        console.error('WebGL not supported! Falling back to Canvas renderer.');
        return;
      }
      // Enable blending for transparency.
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      // Initialize shaders and buffers.
      this.initShaders();
      this.initBuffers();
    }
  
    initShaders() {
      const gl = this.gl;

      // Vertex shader for particles.
      const vsSourceParticles = `
        attribute vec3 aVertexPosition;
        attribute float aPointSize;
        attribute vec4 aColor;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uViewMatrix;
        uniform vec3 uCameraPosition;
        uniform float uFogStart;
        uniform float uFogEnd;
        varying vec4 vColor;
        
        void main(void) {
          gl_Position = uProjectionMatrix * uViewMatrix * vec4(aVertexPosition, 1.0);
          gl_PointSize = aPointSize;
          
          // Calculate distance from camera to particle for fog effect
          float distanceToCamera = distance(aVertexPosition, uCameraPosition);
          
          // Calculate fog factor (0 = fully visible, 1 = fully hidden)
          float fogFactor = clamp(
            (distanceToCamera - uFogStart) / (uFogEnd - uFogStart),
            0.0, 1.0
          );
          
          // Apply fog to the color's alpha component
          vColor = vec4(aColor.rgb, aColor.a * (1.0 - fogFactor));
        }
      `;
      // Fragment shader for particles.
      const fsSourceParticles = `
        precision mediump float;
        varying vec4 vColor;
        void main(void) {
          // Draw circular point with soft edge glow effect
          vec2 coord = gl_PointCoord - vec2(0.5);
          float distance = length(coord);
          
          // Create a soft edge with exponential falloff
          float alpha = vColor.a * exp(-distance * 3.5);
          
          // Discard pixels outside the circle
          if (distance > 0.5) {
            discard;
          }
          
          gl_FragColor = vec4(vColor.rgb, alpha);
        }
      `;
      this.particleShaderProgram = this.initShaderProgram(vsSourceParticles, fsSourceParticles);
      // Look up attribute/uniform locations.
      this.particleShaderProgram.aVertexPosition = gl.getAttribLocation(this.particleShaderProgram, 'aVertexPosition');
      this.particleShaderProgram.aPointSize = gl.getAttribLocation(this.particleShaderProgram, 'aPointSize');
      this.particleShaderProgram.aColor = gl.getAttribLocation(this.particleShaderProgram, 'aColor');
      this.particleShaderProgram.uProjectionMatrix = gl.getUniformLocation(this.particleShaderProgram, 'uProjectionMatrix');
      this.particleShaderProgram.uViewMatrix = gl.getUniformLocation(this.particleShaderProgram, 'uViewMatrix');
      this.particleShaderProgram.uCameraPosition = gl.getUniformLocation(this.particleShaderProgram, 'uCameraPosition');
      this.particleShaderProgram.uFogStart = gl.getUniformLocation(this.particleShaderProgram, 'uFogStart');
      this.particleShaderProgram.uFogEnd = gl.getUniformLocation(this.particleShaderProgram, 'uFogEnd');

      // Vertex shader for connection lines.
      const vsSourceLines = `
        attribute vec3 aVertexPosition;
        attribute vec4 aColor;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uViewMatrix;
        uniform vec3 uCameraPosition;
        uniform float uFogStart;
        uniform float uFogEnd;
        varying vec4 vColor;
        
        void main(void) {
          gl_Position = uProjectionMatrix * uViewMatrix * vec4(aVertexPosition, 1.0);
          
          // Calculate distance from camera to vertex for fog effect
          float distanceToCamera = distance(aVertexPosition, uCameraPosition);
          
          // Calculate fog factor (0 = fully visible, 1 = fully hidden)
          float fogFactor = clamp(
            (distanceToCamera - uFogStart) / (uFogEnd - uFogStart),
            0.0, 1.0
          );
          
          // Apply fog to the color's alpha component
          vColor = vec4(aColor.rgb, aColor.a * (1.0 - fogFactor));
        }
      `;
      // Fragment shader for connection lines.
      const fsSourceLines = `
        precision mediump float;
        varying vec4 vColor;
        void main(void) {
          gl_FragColor = vColor;
        }
      `;
      this.lineShaderProgram = this.initShaderProgram(vsSourceLines, fsSourceLines);
      this.lineShaderProgram.aVertexPosition = gl.getAttribLocation(this.lineShaderProgram, 'aVertexPosition');
      this.lineShaderProgram.aColor = gl.getAttribLocation(this.lineShaderProgram, 'aColor');
      this.lineShaderProgram.uProjectionMatrix = gl.getUniformLocation(this.lineShaderProgram, 'uProjectionMatrix');
      this.lineShaderProgram.uViewMatrix = gl.getUniformLocation(this.lineShaderProgram, 'uViewMatrix');
      this.lineShaderProgram.uCameraPosition = gl.getUniformLocation(this.lineShaderProgram, 'uCameraPosition');
      this.lineShaderProgram.uFogStart = gl.getUniformLocation(this.lineShaderProgram, 'uFogStart');
      this.lineShaderProgram.uFogEnd = gl.getUniformLocation(this.lineShaderProgram, 'uFogEnd');
    }
  
    initShaderProgram(vsSource, fsSource) {
      const gl = this.gl;
      const vertexShader = this.loadShader(gl.VERTEX_SHADER, vsSource);
      const fragmentShader = this.loadShader(gl.FRAGMENT_SHADER, fsSource);
      
      // Create the shader program.
      const shaderProgram = gl.createProgram();
      gl.attachShader(shaderProgram, vertexShader);
      gl.attachShader(shaderProgram, fragmentShader);
      gl.linkProgram(shaderProgram);
      
      if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Shader program failed to link: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
      }
      return shaderProgram;
    }
  
    loadShader(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Error compiling shader:' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }
    
    initBuffers() {
      const gl = this.gl;
      // Buffer for particle positions, sizes, and colors
      this.particleBuffer = gl.createBuffer();
      // Buffer for connection lines and colors
      this.lineBuffer = gl.createBuffer();
      this.lineColorBuffer = gl.createBuffer();
    }
  
    clear() {
      const gl = this.gl;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0.07, 0.07, 0.07, 1.0); // Use BACKGROUND_COLOR (e.g., "#111")
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  
    /**
     * Draw the particles.
     * @param {Array} particles - Array of Particle objects (each must have x,y,z and size)
     * @param {Camera} camera - Camera object that provides projection and view matrices.
     * @param {number} [velocityFactor=0] - Additional velocity factor for chromatic effects
     */
    drawParticles(particles, camera, velocityFactor = 0) {
      if (particles.length === 0) return;
      
      const gl = this.gl;
      const projectionMatrix = camera.getProjectionMatrix();
      const viewMatrix = camera.getViewMatrix();
      
      // Get screen right vector for chromatic aberration
      const screenR = camera.getScreenRightVector();
      
      // Create arrays for each chromatic channel (red, blue, white)
      // Add a glow layer for each color
      const glowVertices = new Float32Array(particles.length * 8); // Glow layer
      const redVertices = new Float32Array(particles.length * 8); // 3 for position, 1 for size, 4 for color
      const blueVertices = new Float32Array(particles.length * 8);
      const whiteVertices = new Float32Array(particles.length * 8);
      
      let gIdx = 0, rIdx = 0, bIdx = 0, wIdx = 0;
      
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p.screen) continue;
        
        // Calculate chromatic aberration offset based on distance from camera
        const offset = this.calculateChromaticOffset(p, screenR, velocityFactor);
        
        // Calculate particle size with screen scaling
        // Increase size by 15% for WebGL to match Canvas appearance
        const size = p.size * 1.15 * (p.screen ? p.screen.scale : 1.0);
        
        // Glow layer (larger and semi-transparent)
        glowVertices[gIdx++] = p.x;
        glowVertices[gIdx++] = p.y;
        glowVertices[gIdx++] = p.z;
        glowVertices[gIdx++] = size * 1.7; // Larger size for glow effect
        glowVertices[gIdx++] = 1.0; // r
        glowVertices[gIdx++] = 1.0; // g
        glowVertices[gIdx++] = 1.0; // b
        glowVertices[gIdx++] = p.opacity * 0.3; // Lower opacity for glow
        
        // Red channel (shifted left)
        redVertices[rIdx++] = p.x - offset.x;
        redVertices[rIdx++] = p.y - offset.y;
        redVertices[rIdx++] = p.z;
        redVertices[rIdx++] = size * 0.8; // Slightly smaller for chromatic channels
        redVertices[rIdx++] = 1.0; // r
        redVertices[rIdx++] = 0.0; // g
        redVertices[rIdx++] = 0.0; // b
        redVertices[rIdx++] = p.opacity * this.config.CHROMATIC_STRENGTH;
        
        // Blue channel (shifted right)
        blueVertices[bIdx++] = p.x + offset.x;
        blueVertices[bIdx++] = p.y + offset.y;
        blueVertices[bIdx++] = p.z;
        blueVertices[bIdx++] = size * 0.8; // Slightly smaller for chromatic channels
        blueVertices[bIdx++] = 0.0; // r
        blueVertices[bIdx++] = 1.0; // g
        blueVertices[bIdx++] = 1.0; // b
        blueVertices[bIdx++] = p.opacity * this.config.CHROMATIC_STRENGTH;
        
        // White center
        whiteVertices[wIdx++] = p.x;
        whiteVertices[wIdx++] = p.y;
        whiteVertices[wIdx++] = p.z;
        whiteVertices[wIdx++] = size; // Full size for white center
        whiteVertices[wIdx++] = 1.0; // r
        whiteVertices[wIdx++] = 1.0; // g
        whiteVertices[wIdx++] = 1.0; // b
        whiteVertices[wIdx++] = p.opacity;
      }
      
      gl.useProgram(this.particleShaderProgram);
      gl.uniformMatrix4fv(this.particleShaderProgram.uProjectionMatrix, false, projectionMatrix);
      gl.uniformMatrix4fv(this.particleShaderProgram.uViewMatrix, false, viewMatrix);
      gl.uniform3fv(this.particleShaderProgram.uCameraPosition, new Float32Array([camera.position.x, camera.position.y, camera.position.z]));
      gl.uniform1f(this.particleShaderProgram.uFogStart, this.config.FOG_START);
      gl.uniform1f(this.particleShaderProgram.uFogEnd, this.config.FOG_END);
      
      // Enable blending for transparency
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      
      // Draw glow layer first (behind everything)
      if (gIdx > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, glowVertices.subarray(0, gIdx), gl.DYNAMIC_DRAW);
        
        gl.vertexAttribPointer(this.particleShaderProgram.aVertexPosition, 3, gl.FLOAT, false, 32, 0);
        gl.vertexAttribPointer(this.particleShaderProgram.aPointSize, 1, gl.FLOAT, false, 32, 12);
        gl.vertexAttribPointer(this.particleShaderProgram.aColor, 4, gl.FLOAT, false, 32, 16);
        
        gl.enableVertexAttribArray(this.particleShaderProgram.aVertexPosition);
        gl.enableVertexAttribArray(this.particleShaderProgram.aPointSize);
        gl.enableVertexAttribArray(this.particleShaderProgram.aColor);
        
        gl.drawArrays(gl.POINTS, 0, gIdx / 8);
      }
      
      // Draw red channel
      if (rIdx > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, redVertices.subarray(0, rIdx), gl.DYNAMIC_DRAW);
        
        gl.vertexAttribPointer(this.particleShaderProgram.aVertexPosition, 3, gl.FLOAT, false, 32, 0);
        gl.vertexAttribPointer(this.particleShaderProgram.aPointSize, 1, gl.FLOAT, false, 32, 12);
        gl.vertexAttribPointer(this.particleShaderProgram.aColor, 4, gl.FLOAT, false, 32, 16);
        
        gl.enableVertexAttribArray(this.particleShaderProgram.aVertexPosition);
        gl.enableVertexAttribArray(this.particleShaderProgram.aPointSize);
        gl.enableVertexAttribArray(this.particleShaderProgram.aColor);
        
        gl.drawArrays(gl.POINTS, 0, rIdx / 8);
      }
      
      // Draw blue channel
      if (bIdx > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, blueVertices.subarray(0, bIdx), gl.DYNAMIC_DRAW);
        
        gl.vertexAttribPointer(this.particleShaderProgram.aVertexPosition, 3, gl.FLOAT, false, 32, 0);
        gl.vertexAttribPointer(this.particleShaderProgram.aPointSize, 1, gl.FLOAT, false, 32, 12);
        gl.vertexAttribPointer(this.particleShaderProgram.aColor, 4, gl.FLOAT, false, 32, 16);
        
        gl.enableVertexAttribArray(this.particleShaderProgram.aVertexPosition);
        gl.enableVertexAttribArray(this.particleShaderProgram.aPointSize);
        gl.enableVertexAttribArray(this.particleShaderProgram.aColor);
        
        gl.drawArrays(gl.POINTS, 0, bIdx / 8);
      }
      
      // Draw white center
      if (wIdx > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, whiteVertices.subarray(0, wIdx), gl.DYNAMIC_DRAW);
        
        gl.vertexAttribPointer(this.particleShaderProgram.aVertexPosition, 3, gl.FLOAT, false, 32, 0);
        gl.vertexAttribPointer(this.particleShaderProgram.aPointSize, 1, gl.FLOAT, false, 32, 12);
        gl.vertexAttribPointer(this.particleShaderProgram.aColor, 4, gl.FLOAT, false, 32, 16);
        
        gl.enableVertexAttribArray(this.particleShaderProgram.aVertexPosition);
        gl.enableVertexAttribArray(this.particleShaderProgram.aPointSize);
        gl.enableVertexAttribArray(this.particleShaderProgram.aColor);
        
        gl.drawArrays(gl.POINTS, 0, wIdx / 8);
      }
    }

    /**
     * Draw connection lines between particles.
     * Here the connections are computed on CPU (for example, via the spatial grid) and then passed in.
     * @param {Array} connections - Array of objects of form { p1, p2 }.
     * @param {Camera} camera - The camera.
     * @param {number} [velocityFactor=0] - Additional velocity factor for chromatic effects
     */
    drawConnections(connections, camera, velocityFactor = 0) {
      if (connections.length === 0) return;
      
      const gl = this.gl;
      const projectionMatrix = camera.getProjectionMatrix();
      const viewMatrix = camera.getViewMatrix();
      
      // Get screen right vector for chromatic aberration
      const screenR = camera.getScreenRightVector();
      
      // Create arrays for each chromatic channel (red, blue, white)
      const redVertices = new Float32Array(connections.length * 14); // 7 values per vertex, 2 vertices per line
      const blueVertices = new Float32Array(connections.length * 14);
      const whiteVertices = new Float32Array(connections.length * 14);
      
      let rIdx = 0, bIdx = 0, wIdx = 0;
      
      for (let conn of connections) {
        const p1 = conn.p1;
        const p2 = conn.p2;
        
        // Calculate distance between particles for opacity
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        // Calculate connection opacity based on distance and particle opacities
        const avgOpacity = (p1.opacity + p2.opacity) / 2 || 1.0;
        const connectionOpacity = (1 - distance / this.config.CONNECTION_DISTANCE) * avgOpacity;
        
        // Calculate chromatic offset for each point
        const offset1 = this.calculateChromaticOffset(p1, screenR, velocityFactor);
        const offset2 = this.calculateChromaticOffset(p2, screenR, velocityFactor);
        
        // Red channel (shifted left)
        // First vertex (p1)
        redVertices[rIdx++] = p1.x - offset1.x;
        redVertices[rIdx++] = p1.y - offset1.y;
        redVertices[rIdx++] = p1.z;
        redVertices[rIdx++] = 1.0; // r
        redVertices[rIdx++] = 0.0; // g
        redVertices[rIdx++] = 0.0; // b
        redVertices[rIdx++] = connectionOpacity * this.config.CHROMATIC_STRENGTH;
        
        // Second vertex (p2)
        redVertices[rIdx++] = p2.x - offset2.x;
        redVertices[rIdx++] = p2.y - offset2.y;
        redVertices[rIdx++] = p2.z;
        redVertices[rIdx++] = 1.0; // r
        redVertices[rIdx++] = 0.0; // g
        redVertices[rIdx++] = 0.0; // b
        redVertices[rIdx++] = connectionOpacity * this.config.CHROMATIC_STRENGTH;
        
        // Blue channel (shifted right)
        // First vertex (p1)
        blueVertices[bIdx++] = p1.x + offset1.x;
        blueVertices[bIdx++] = p1.y + offset1.y;
        blueVertices[bIdx++] = p1.z;
        blueVertices[bIdx++] = 0.0; // r
        blueVertices[bIdx++] = 1.0; // g
        blueVertices[bIdx++] = 1.0; // b
        blueVertices[bIdx++] = connectionOpacity * this.config.CHROMATIC_STRENGTH;
        
        // Second vertex (p2)
        blueVertices[bIdx++] = p2.x + offset2.x;
        blueVertices[bIdx++] = p2.y + offset2.y;
        blueVertices[bIdx++] = p2.z;
        blueVertices[bIdx++] = 0.0; // r
        blueVertices[bIdx++] = 1.0; // g
        blueVertices[bIdx++] = 1.0; // b
        blueVertices[bIdx++] = connectionOpacity * this.config.CHROMATIC_STRENGTH;
        
        // White center
        // First vertex (p1)
        whiteVertices[wIdx++] = p1.x;
        whiteVertices[wIdx++] = p1.y;
        whiteVertices[wIdx++] = p1.z;
        whiteVertices[wIdx++] = 1.0; // r
        whiteVertices[wIdx++] = 1.0; // g
        whiteVertices[wIdx++] = 1.0; // b
        whiteVertices[wIdx++] = connectionOpacity;
        
        // Second vertex (p2)
        whiteVertices[wIdx++] = p2.x;
        whiteVertices[wIdx++] = p2.y;
        whiteVertices[wIdx++] = p2.z;
        whiteVertices[wIdx++] = 1.0; // r
        whiteVertices[wIdx++] = 1.0; // g
        whiteVertices[wIdx++] = 1.0; // b
        whiteVertices[wIdx++] = connectionOpacity;
      }
      
      gl.useProgram(this.lineShaderProgram);
      gl.uniformMatrix4fv(this.lineShaderProgram.uProjectionMatrix, false, projectionMatrix);
      gl.uniformMatrix4fv(this.lineShaderProgram.uViewMatrix, false, viewMatrix);
      gl.uniform3fv(this.lineShaderProgram.uCameraPosition, new Float32Array([camera.position.x, camera.position.y, camera.position.z]));
      gl.uniform1f(this.lineShaderProgram.uFogStart, this.config.FOG_START);
      gl.uniform1f(this.lineShaderProgram.uFogEnd, this.config.FOG_END);
      
      // Enable blending for transparency
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      
      // Draw red channel
      if (rIdx > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, redVertices.subarray(0, rIdx), gl.DYNAMIC_DRAW);
        
        gl.vertexAttribPointer(this.lineShaderProgram.aVertexPosition, 3, gl.FLOAT, false, 28, 0);
        gl.vertexAttribPointer(this.lineShaderProgram.aColor, 4, gl.FLOAT, false, 28, 12);
        
        gl.enableVertexAttribArray(this.lineShaderProgram.aVertexPosition);
        gl.enableVertexAttribArray(this.lineShaderProgram.aColor);
        
        gl.drawArrays(gl.LINES, 0, rIdx / 7);
      }
      
      // Draw blue channel
      if (bIdx > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, blueVertices.subarray(0, bIdx), gl.DYNAMIC_DRAW);
        
        gl.vertexAttribPointer(this.lineShaderProgram.aVertexPosition, 3, gl.FLOAT, false, 28, 0);
        gl.vertexAttribPointer(this.lineShaderProgram.aColor, 4, gl.FLOAT, false, 28, 12);
        
        gl.enableVertexAttribArray(this.lineShaderProgram.aVertexPosition);
        gl.enableVertexAttribArray(this.lineShaderProgram.aColor);
        
        gl.drawArrays(gl.LINES, 0, bIdx / 7);
      }
      
      // Draw white center
      if (wIdx > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, whiteVertices.subarray(0, wIdx), gl.DYNAMIC_DRAW);
        
        gl.vertexAttribPointer(this.lineShaderProgram.aVertexPosition, 3, gl.FLOAT, false, 28, 0);
        gl.vertexAttribPointer(this.lineShaderProgram.aColor, 4, gl.FLOAT, false, 28, 12);
        
        gl.enableVertexAttribArray(this.lineShaderProgram.aVertexPosition);
        gl.enableVertexAttribArray(this.lineShaderProgram.aColor);
        
        gl.drawArrays(gl.LINES, 0, wIdx / 7);
      }
    }
  
    /**
     * Calculate chromatic aberration offset based on position and velocity
     * @param {Object|number} particleOrX - Either a particle object or X coordinate
     * @param {Object|number} screenROrY - Either screen right vector or Y coordinate
     * @param {number} velocityFactorOrBaseOffset - Either velocity factor or base offset amount
     * @param {Object} [rightVector] - Screen-space right vector (when using x,y coordinates)
     * @param {number} [velocityFactor] - Additional velocity factor for effects (when using x,y coordinates)
     * @returns {Object} - The offset vector {x, y}
     */
    calculateChromaticOffset(particleOrX, screenROrY, velocityFactorOrBaseOffset, rightVector, velocityFactor) {
      // Handle both function signatures:
      // 1. (particle, screenR, velocityFactor) - WebGL original
      // 2. (x, y, baseOffset, rightVector, velocityFactor) - Canvas style
      
      let x, y, screenR, baseOffset;
      
      if (typeof particleOrX === 'object') {
        // First signature: (particle, screenR, velocityFactor)
        if (!particleOrX.screen) {
          return { x: 0, y: 0 };
        }
        
        x = Math.round(particleOrX.screen.x);
        y = Math.round(particleOrX.screen.y);
        screenR = screenROrY;
        baseOffset = this.config.CHROMATIC_OFFSET;
        velocityFactor = velocityFactorOrBaseOffset || 0;
        
        // Apply a milder damping factor for particles close to the camera (based on z position)
        // This helps match the Canvas renderer behavior while maintaining a stronger effect
        const zDamping = Math.min(Math.max((Math.abs(particleOrX.z) - 5) / 150, 0.2), 1);
      } else {
        // Second signature: (x, y, baseOffset, rightVector, velocityFactor)
        x = Math.round(particleOrX);
        y = Math.round(screenROrY);
        baseOffset = velocityFactorOrBaseOffset;
        screenR = rightVector;
        // velocityFactor is already in the right parameter
      }
      
      // Calculate distance from center of screen
      const centerX = Math.round(this.canvas.width / 2);
      const centerY = Math.round(this.canvas.height / 2);
      const dx = x - centerX;
      const dy = y - centerY;
      
      // Normalize distance based on screen dimensions for consistent effect across different resolutions
      const maxDimension = Math.max(this.canvas.width, this.canvas.height);
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy) / maxDimension;
      
      // Calculate offset based on distance and scroll velocity
      const distanceOffset = distanceFromCenter * this.config.CHROMATIC_DISTANCE_FACTOR * 0.7;
      const velocityOffset = velocityFactor * (this.config.CHROMATIC_VELOCITY_FACTOR * 0.6);
      
      // Combine factors and apply z-based damping if available
      let totalOffset;
      if (typeof particleOrX === 'object') {
        // For particle objects, include z-damping
        const zDamping = Math.min(Math.max((Math.abs(particleOrX.z) - 5) / 150, 0.2), 1);
        totalOffset = Math.round(baseOffset * 1.2 * 
                              (1 + distanceOffset + velocityOffset) * 
                              zDamping * 10) / 10;
      } else {
        // For x,y coordinates (Canvas style), no z-damping
        totalOffset = Math.round(baseOffset * (1 + distanceOffset + velocityOffset) * 10) / 10;
      }
      
      // Use camera's right vector for consistent offset relative to camera orientation
      return {
        x: Math.round(screenR.x * totalOffset * 10) / 10,
        y: Math.round(screenR.y * totalOffset * 10) / 10
      };
    }
  }
  
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGLRenderer;
  } else {
    window.WebGLRenderer = WebGLRenderer;
  }