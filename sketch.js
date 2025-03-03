// Global variables
let enemies = [];
let arrows = [];
let score = 0;
let gold = 0;  // New gold currency
let towerHealth = 100;
let lastEnemyTime = 0;
let groundPoints = []; // Points for terrain
let trees = []; // Array to store tree positions
let rocks = []; // Array to store rock positions
let mountains = []; // Array to store mountain data
let mountainPoints = []; // Array to store pre-calculated mountain points
let grassDetails = []; // Array to store grass details
let skyGradient = []; // Array to store sky gradient colors
let treeShapes = []; // Array to store pre-generated tree shapes
let rockDetails = []; // Array to store pre-generated rock details
let bloodParticles = [];
let stuckArrows = [];
let clouds = []; // Store cloud positions

// Level system
let currentLevel = 1;
let enemiesRemaining = 5; // Enemies per level
let enemiesSpawned = 0;
let levelComplete = false;
let levelStartTime = 0;
let levelTransitionTimer = 0;
const TRANSITION_DURATION = 2000; // 2 seconds for level transition
let gameStarted = false; // New flag to track if game has started
let nextLevelButton = null; // New variable to track the next level button

// Upgrade system
const UPGRADES = {
  DAMAGE: {
    name: "Arrow Damage",
    cost: 3,
    level: 1,
    maxLevel: 5,
    description: "Increase arrow damage",
    getValue: (level) => level * 0.5 + 1
  },
  TOWER_HEALTH: {
    name: "Tower Health",
    cost: 2,
    level: 1,
    maxLevel: 5,
    description: "Increase tower max health",
    getValue: (level) => 100 + (level - 1) * 25
  },
  ARROW_SPEED: {
    name: "Arrow Speed",
    cost: 3,
    level: 1,
    maxLevel: 5,
    description: "Increase arrow speed",
    getValue: (level) => 1 + (level - 1) * 0.2
  }
};

// Environment themes (one for each season)
const THEMES = {
  SPRING: {
    sky: { top: [100, 180, 255], bottom: [180, 220, 255] },
    grass: [65, 200, 65],
    mountain: { light: [90, 130, 170], dark: [70, 100, 140] },
    water: { base: [100, 170, 220], alpha: 180 }
  },
  SUMMER: {
    sky: { top: [80, 140, 255], bottom: [160, 200, 255] },
    grass: [34, 139, 34],
    mountain: { light: [110, 125, 160], dark: [90, 105, 140] },
    water: { base: [100, 150, 200], alpha: 180 }
  },
  AUTUMN: {
    sky: { top: [170, 120, 255], bottom: [220, 180, 255] },
    grass: [160, 120, 34],
    mountain: { light: [140, 100, 120], dark: [120, 80, 100] },
    water: { base: [130, 130, 180], alpha: 180 }
  },
  WINTER: {
    sky: { top: [150, 150, 255], bottom: [200, 200, 255] },
    grass: [220, 220, 220],
    mountain: { light: [200, 200, 220], dark: [180, 180, 200] },
    water: { base: [150, 150, 200], alpha: 200 }
  }
};

// Helper functions
function getGroundY(x) {
  for (let i = 0; i < groundPoints.length - 1; i++) {
    if (x >= groundPoints[i].x && x < groundPoints[i + 1].x) {
      let t = (x - groundPoints[i].x) / (groundPoints[i + 1].x - groundPoints[i].x);
      return lerp(groundPoints[i].y, groundPoints[i + 1].y, t);
    }
  }
  return groundLevel;
}

function getLevelConfig(level) {
  return {
    enemyCount: 5 + Math.floor(level * 1.5),
    enemyTypes: level < 3 ? ['goblin'] :
                level < 5 ? ['goblin', 'orc'] :
                ['goblin', 'orc', 'troll'],
    enemySpeed: enemySpeed * (1 + level * 0.1),
    baseSpawnInterval: Math.max(2000 - level * 100, 1200),
    spawnVariance: 1000,
    minSpawnGap: 800,
    waveSize: Math.min(2 + Math.floor(level / 2), 4),
    waveCooldown: Math.max(4000 - level * 200, 2500),
    // Enhanced terrain configuration
    terrainRoughness: 0.003 + (level % 4) * 0.002, // More variation in roughness
    hillHeight: 60 + (level % 5) * 25, // More variation in hill height
    valleyFrequency: 0.5 + (level % 3) * 0.3, // How often valleys appear
    peakFrequency: 0.3 + (level % 4) * 0.2 // How often peaks appear
  };
}

function getCurrentTheme() {
  // Special case for level 3 (cherry blossom biome)
  if (currentLevel === 3) {
    return {
      sky: { top: [180, 160, 255], bottom: [230, 210, 255] }, // Soft lavender sky
      grass: [200, 180, 170], // Soft pinkish-beige soil
      mountain: { light: [160, 140, 170], dark: [140, 120, 150] }, // Soft purple mountains
      water: { base: [180, 170, 220], alpha: 180 } // Lavender-tinted water
    };
  }
  
  // Original theme selection for other levels
  const themes = Object.values(THEMES);
  return themes[(currentLevel - 1) % themes.length];
}

// Bow and arrow mechanics
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let maxPullback = 200; // Reduced from 300 for more comfortable long shots
let minSpeed = 200;
let maxSpeed = 2000; // Significantly increased from 900 to allow reaching the end of the map

const g = 1200; // Base gravity
const initialSpeed = 400;
const enemySpeed = 15;
const groundLevel = 450; // Raised from 550 to 450 to match previous height
const towerPos = { x: 50, y: groundLevel - 100 };
const archerPos = { x: 50, y: groundLevel - 130 }; // Centered on tower and higher up

// Enemy types with equipment details
const ENEMY_TYPES = {
  GOBLIN: {
    type: 'goblin',
    weapon: 'dagger',
    armor: 'leather',
    color: { body: [34, 139, 34], head: [50, 205, 50] }
  },
  ORC: {
    type: 'orc',
    weapon: 'axe',
    armor: 'chainmail',
    color: { body: [100, 139, 34], head: [120, 205, 50] }
  },
  TROLL: {
    type: 'troll',
    weapon: 'club',
    armor: 'plate',
    color: { body: [139, 139, 34], head: [205, 205, 50] }
  }
};

// Arrow class definition
class Arrow {
  constructor(pos, vel) {
    this.pos = pos;
    this.vel = vel;
    this.angle = atan2(vel.y, vel.x);
    this.dead = false;
    this.homingRange = 30; // Keep the same homing range for gameplay
    this.maxHomingForce = 0.8;
    this.length = 8; // Adjusted from 6 to 8 (60% smaller than original)
    this.hitSize = 20; // Keep original size for hit detection
  }
  
  update(dt) {
    if (this.dead) return;
    
    // Store original velocity for angle calculation
    let originalVx = this.vel.x;
    let originalVy = this.vel.y;
    
    // Check for nearby enemies and apply subtle homing
    let closestEnemy = null;
    let closestDist = this.homingRange;
    
    for (let enemy of enemies) {
      let d = dist(this.pos.x, this.pos.y, enemy.pos.x, enemy.pos.y - enemy.getHeight()/2);
      if (d < closestDist) {
        closestDist = d;
        closestEnemy = enemy;
      }
    }
    
    // Apply homing force if enemy is in range
    if (closestEnemy) {
      // Calculate direction to enemy
      let dx = closestEnemy.pos.x - this.pos.x;
      let dy = (closestEnemy.pos.y - closestEnemy.getHeight()/2) - this.pos.y;
      let angle = atan2(dy, dx);
      
      // Calculate homing force (stronger when closer)
      let homingStrength = map(closestDist, this.homingRange, 0, 0, this.maxHomingForce);
      
      // Apply homing force
      this.vel.x += cos(angle) * homingStrength;
      this.vel.y += sin(angle) * homingStrength;
    }
    
    // Update position
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.vel.y += g * dt;
    
    // Update angle based on velocity, but smooth it for better visual
    let targetAngle = atan2(this.vel.y, this.vel.x);
    this.angle = lerp(this.angle, targetAngle, 0.2);
    
    // Check if arrow hit the ground
    if (this.pos.y > getGroundY(this.pos.x)) {
      this.dead = true;
    }
    
    // Check if arrow is off screen
    if (this.pos.x < 0 || this.pos.x > width || this.pos.y < 0) {
      this.dead = true;
    }
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    
    // Wooden shaft (thin brown line)
    strokeWeight(1); // Keep thin stroke for visibility
    stroke(139, 69, 19); // Brown
    line(-this.length, 0, this.length * 0.7, 0);
    
    // Arrowhead (small triangle)
    fill(200); // Light gray
    noStroke();
    let headSize = 2; // Adjusted from 1.5 to 2
    triangle(
      this.length * 0.7, 0,
      this.length * 0.5, -headSize,
      this.length * 0.5, headSize
    );
    
    // Fletching (three feathers)
    fill(255); // White feathers
    let fletchSize = 2; // Adjusted from 1.5 to 2
    let fletchLength = 2.5; // Adjusted from 2 to 2.5
    
    // Right feather
    push();
    translate(-this.length + fletchLength, 0);
    rotate(-PI/6);
    triangle(
      0, 0,
      -fletchLength, fletchSize/2,
      -fletchLength, -fletchSize/2
    );
    pop();
    
    // Left feather
    push();
    translate(-this.length + fletchLength, 0);
    rotate(PI/6);
    triangle(
      0, 0,
      -fletchLength, fletchSize/2,
      -fletchLength, -fletchSize/2
    );
    pop();
    
    // Middle feather - slightly smaller for better proportion
    push();
    translate(-this.length + fletchLength, 0);
    triangle(
      0, 0,
      -fletchLength * 0.9, fletchSize/2.5,
      -fletchLength * 0.9, -fletchSize/2.5
    );
    pop();
    
    pop();
  }
}

// Enemy class definition
class Enemy {
  constructor(config) {
    // Reset all properties first
    this.health = null;
    this.maxHealth = null;
    this.type = null;
    this.spawnOrderInLevel = enemiesSpawned;
    this.isElite = false;  // Reset elite status
    
    // Initialize type first
    if (config.enemyTypes.length === 1) {
      this.type = config.enemyTypes[0];
    } else {
      this.type = this.randomType(config.enemyTypes);
    }
    
    // Elite enemy check for all levels
    if (enemiesSpawned === 0) {
      this.isElite = true;
      // Scale elite health with level: 2 health for level 1, 3 for level 2, etc.
      this.maxHealth = Math.min(currentLevel + 1, 5);  // Cap at 5 health
      this.health = this.maxHealth;
    } else {
      this.maxHealth = this.getBaseHealth();
      this.health = this.maxHealth;
    }
    
    // Initialize position and other properties
    this.pos = { x: 800, y: this.getGroundY(800) - this.getHeight() };
    this.vel = { x: -this.getSpeed(config.enemySpeed), y: 0 };
    this.attacking = false;
    this.attackTimer = 0;
    this.attackInterval = 1000;
    this.walkCycle = 0;
    this.hitEffect = 0;
  }

  randomType(availableTypes) {
    if (availableTypes.length === 1) return availableTypes[0];
    
    const weights = availableTypes.map(type => 
      type === ENEMY_TYPES.GOBLIN.type ? 0.6 :
      type === ENEMY_TYPES.ORC.type ? 0.3 :
      0.1
    );
    
    let rand = random();
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (rand < sum) return availableTypes[i];
    }
    return availableTypes[0];
  }

  getSpeed(baseSpeed) {
    switch(this.type) {
      case ENEMY_TYPES.GOBLIN.type: return baseSpeed;
      case ENEMY_TYPES.ORC.type: return baseSpeed * 0.8;
      case ENEMY_TYPES.TROLL.type: return baseSpeed * 0.5;
      default: return baseSpeed;
    }
  }

  getBaseHealth() {
    switch(this.type) {
      case ENEMY_TYPES.GOBLIN.type: return 1;
      case ENEMY_TYPES.ORC.type: return 2;
      case ENEMY_TYPES.TROLL.type: return 3;
      default: return 1;
    }
  }

  getHeight() {
    switch(this.type) {
      case ENEMY_TYPES.GOBLIN.type: return 15;
      case ENEMY_TYPES.ORC.type: return 20;
      case ENEMY_TYPES.TROLL.type: return 30;
      default: return 15;
    }
  }

  getGroundY(x) {
    // Find ground height at current x position
    for (let i = 0; i < groundPoints.length - 1; i++) {
      if (x >= groundPoints[i].x && x < groundPoints[i + 1].x) {
        let t = (x - groundPoints[i].x) / (groundPoints[i + 1].x - groundPoints[i].x);
        return lerp(groundPoints[i].y, groundPoints[i + 1].y, t);
      }
    }
    return groundLevel;
  }

  update(dt) {
    if (!this.attacking) {
      this.pos.x += this.vel.x * dt;
      // Update y position based on ground height
      this.pos.y = this.getGroundY(this.pos.x) - this.getHeight();
      
      // Walking animation
      this.walkCycle += dt * 5;
      let bounceOffset = sin(this.walkCycle) * 3;
      this.pos.y += bounceOffset;

      if (this.pos.x <= 125) {
        this.attacking = true;
      }
    } else {
      this.attackTimer += dt * 1000;
      if (this.attackTimer >= this.attackInterval) {
        towerHealth -= this.getDamage();
        this.attackTimer = 0;
      }
    }
  }

  getDamage() {
    switch(this.type) {
      case ENEMY_TYPES.GOBLIN.type: return 5;
      case ENEMY_TYPES.ORC.type: return 10;
      case ENEMY_TYPES.TROLL.type: return 20;
      default: return 5;
    }
  }

  takeDamage(damage, arrowPos) {
    // Apply damage upgrade multiplier
    const damageMultiplier = UPGRADES.DAMAGE.getValue(UPGRADES.DAMAGE.level);
    const totalDamage = damage * damageMultiplier;
    
    // Apply damage
    this.health = Math.max(0, this.health - totalDamage);
    
    // Create blood particles
    for (let i = 0; i < 8; i++) {
      let angle = random(PI + PI/4, TWO_PI - PI/4);
      let speed = random(100, 200);
      bloodParticles.push(new BloodParticle(
        arrowPos.x,
        arrowPos.y,
        {
          x: cos(angle) * speed,
          y: sin(angle) * speed
        }
      ));
    }
    
    this.hitEffect = 1.0;
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    
    // Draw health bar with improved visibility
    let size = this.getHeight();
    let enemyData = ENEMY_TYPES.GOBLIN;
    
    // Modify colors for elite enemy
    let bodyColor, headColor;
    if (this.isElite) {
      // Elite enemy has a darker, more menacing color
      bodyColor = color(20, 100, 20);  // Darker green
      headColor = color(30, 150, 30);  // Darker head
      
      // Draw health bar with improved visibility for elite
      let healthWidth = 30;
      let healthHeight = 4;
      noStroke();
      // Health bar background
      fill(60);
      rect(-healthWidth/2, -this.getHeight() - 10, healthWidth, healthHeight);
      
      // Purple health bar for elite
      fill(128, 0, 128);  // Purple for elite
      let healthPercent = this.health / this.maxHealth;
      rect(-healthWidth/2, -this.getHeight() - 10, 
           healthWidth * healthPercent, healthHeight);
    } else {
      bodyColor = color(...enemyData.color.body);
      headColor = color(...enemyData.color.head);
      
      // Draw normal health bar
      let healthWidth = 30;
      let healthHeight = 4;
      noStroke();
      // Health bar background
      fill(60);
      rect(-healthWidth/2, -this.getHeight() - 10, healthWidth, healthHeight);
      
      // Red health bar for normal
      fill(200, 0, 0);    // Red for normal
      let healthPercent = this.health / this.maxHealth;
      rect(-healthWidth/2, -this.getHeight() - 10, 
           healthWidth * healthPercent, healthHeight);
    }
    
    // Hit effect (red flash)
    if (this.hitEffect > 0) {
      this.hitEffect -= deltaTime / 1000 * 5;
      tint(255, 100 + this.hitEffect * 155, 100 + this.hitEffect * 155);
    }
    
    // Legs with walking animation
    stroke(bodyColor);
    strokeWeight(size/8);
    let legSwing = sin(this.walkCycle) * 0.3;
    // Back leg
    line(0, 0, 
         -size/4, size/2 + legSwing * size);
    // Front leg
    line(0, 0, 
         size/4, size/2 - legSwing * size);
    
    // Body with armor
    noStroke();
    // Base body
    fill(bodyColor);
    ellipse(0, 0, size * 0.7, size);
    
    // Armor
    switch(enemyData.armor) {
      case 'chainmail':
        // Chainmail texture
        fill(150, 150, 150, 180);
        rect(-size/3, -size/3, size*2/3, size*2/3, size/10);
        // Rivets
        fill(200);
        let rivets = 3;
        for(let i = 0; i < rivets; i++) {
          ellipse(-size/4 + (i*size/4), -size/4, size/10, size/10);
          ellipse(-size/4 + (i*size/4), 0, size/10, size/10);
        }
        break;
      case 'plate':
        // Plate armor
        fill(180, 180, 180, 220);
        rect(-size/3, -size/3, size*2/3, size*2/3, size/8);
        // Armor details
        fill(200);
        rect(-size/4, -size/4, size/2, size/8, size/20);
        rect(-size/4, 0, size/2, size/8, size/20);
        break;
      default: // leather
        // Leather armor
        fill(139, 69, 19, 180);
        rect(-size/3, -size/3, size*2/3, size*2/3, size/6);
        // Stitching
        stroke(101, 67, 33);
        strokeWeight(1);
        line(-size/4, -size/4, size/4, -size/4);
        line(-size/4, 0, size/4, 0);
    }
    
    // Head
    noStroke();
    fill(headColor);
    ellipse(0, -size/2, size * 0.5, size * 0.5);
    
    // Elite Helmet (if elite enemy)
    if (this.isElite) {
      // Choose helmet color based on maxHealth (which corresponds to level)
      let helmetColor;
      switch(this.maxHealth) {
        case 2: // Level 1 elite
          helmetColor = color(192, 192, 192); // Silver
          break;
        case 3: // Level 2 elite
          helmetColor = color(255, 215, 0);   // Gold
          break;
        case 4: // Level 3 elite
          helmetColor = color(150, 0, 255);   // Purple
          break;
        default: // Level 4+ elite
          helmetColor = color(255, 0, 0);     // Red
      }
      
      // Draw helmet base
      fill(helmetColor);
      arc(0, -size/2, size * 0.6, size * 0.6, -PI, 0);
      
      // Draw helmet details
      stroke(helmetColor);
      strokeWeight(size/12);
      noFill();
      arc(0, -size/2, size * 0.5, size * 0.5, -PI * 0.8, -PI * 0.2);
      
      // Draw helmet plume
      noStroke();
      fill(helmetColor);
      beginShape();
      vertex(-size/6, -size/2 - size/4);
      vertex(size/6, -size/2 - size/4);
      vertex(0, -size/2 - size/2);
      endShape(CLOSE);
    }
    
    // Eyes
    fill(255, 0, 0);
    ellipse(-size/8, -size/2, size/10, size/10);
    ellipse(size/8, -size/2, size/10, size/10);
    
    // Ears
    triangle(
      -size/4, -size/2,
      -size/3, -size/1.7,
      -size/4, -size/1.9
    );
    triangle(
      size/4, -size/2,
      size/3, -size/1.7,
      size/4, -size/1.9
    );
    
    // Arms with swing animation and weapons
    stroke(bodyColor);
    strokeWeight(size/8);
    let armSwing = sin(this.walkCycle) * 0.3;
    // Back arm
    line(-size/4, -size/3, 
         -size/2, size/4 + armSwing * size);
    // Front arm
    line(size/4, -size/3, 
         size/2, size/4 - armSwing * size);
    
    // Weapon
    noStroke();
    let weaponSize = size * 0.8;
    switch(enemyData.weapon) {
      case 'axe':
        if (this.attacking) {
          // Handle
          fill(139, 69, 19);
          rect(-weaponSize, -size/3, weaponSize/5, weaponSize);
          // Blade
          fill(200);
          beginShape();
          vertex(-weaponSize - size/3, -size/3);
          vertex(-weaponSize + size/6, -size/2);
          vertex(-weaponSize + size/6, -size/6);
          endShape(CLOSE);
        }
        break;
      case 'club':
        if (this.attacking) {
          // Handle
          fill(139, 69, 19);
          rect(-weaponSize, -size/3, weaponSize/4, weaponSize);
          // Club head
          fill(150);
          ellipse(-weaponSize, -size/3, size/2, size/2);
        }
        break;
      default: // dagger
        if (this.attacking) {
          // Handle
          fill(139, 69, 19);
          rect(-weaponSize, -size/3, weaponSize/6, weaponSize/2);
          // Blade
          fill(200);
          triangle(
            -weaponSize, -size/3 - weaponSize/2,
            -weaponSize - size/6, -size/3,
            -weaponSize + size/6, -size/3
          );
        }
    }
    
    pop();
  }
}

// Setup function
function setup() {
  let canvas = createCanvas(800, 600);
  canvas.style('z-index', '0');  // Ensure canvas is below UI elements
  canvas.style('position', 'absolute');  // Position canvas absolutely
  canvas.style('left', '50%');  // Center horizontally
  canvas.style('top', '50%');  // Center vertically
  canvas.style('transform', 'translate(-50%, -50%)');  // Center using transform
  frameRate(60);
  
  // Create a container for UI elements
  let uiContainer = createElement('div');
  uiContainer.style('position', 'absolute');
  uiContainer.style('width', '800px');
  uiContainer.style('height', '600px');
  uiContainer.style('left', '50%');
  uiContainer.style('top', '50%');
  uiContainer.style('transform', 'translate(-50%, -50%)');
  uiContainer.style('z-index', '1');
  uiContainer.id('uiContainer');
  
  // Reset ALL game state variables
  enemies = [];
  arrows = [];
  score = 0;
  towerHealth = 100;
  lastEnemyTime = 0;
  groundPoints = [];
  trees = [];
  rocks = [];
  mountains = [];
  mountainPoints = [];
  grassDetails = [];
  skyGradient = [];
  treeShapes = [];
  rockDetails = [];
  bloodParticles = [];
  stuckArrows = [];
  
  // Reset level system variables
  currentLevel = 1;
  enemiesRemaining = 5;
  enemiesSpawned = 0;
  levelComplete = false;
  levelStartTime = 0;
  levelTransitionTimer = 0;
  gameStarted = false;
  
  // Reset input state
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;
  
  // Initialize clouds
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: random(width),
      y: random(50, 150),
      width: random(100, 200),
      speed: random(5, 15)
    });
  }
  
  showMainMenu();
}

function showMainMenu() {
  // Remove any existing UI elements
  removeElements();
  
  // Get or create UI container
  let uiContainer = select('#uiContainer');
  if (!uiContainer) {
    uiContainer = createElement('div');
    uiContainer.id('uiContainer');
    uiContainer.style('position', 'absolute');
    uiContainer.style('width', '800px');
    uiContainer.style('height', '600px');
    uiContainer.style('left', '50%');
    uiContainer.style('top', '50%');
    uiContainer.style('transform', 'translate(-50%, -50%)');
    uiContainer.style('z-index', '1');
  }
  
  // Create title with medieval font
  let title = createElement('h1', 'Tower Defense');
  title.parent(uiContainer);
  title.style('position', 'absolute');
  title.style('width', '400px');
  title.style('left', '50%');
  title.style('top', '33%');
  title.style('transform', 'translate(-50%, -100%)');
  title.style('color', '#FFD700'); // Gold color
  title.style('font-family', "'MedievalSharp', cursive");
  title.style('font-size', '64px');
  title.style('text-shadow', '2px 2px 8px #000000, -1px -1px 0 #8B4513, 1px -1px 0 #8B4513, -1px 1px 0 #8B4513, 1px 1px 0 #8B4513');
  title.style('-webkit-text-stroke', '2px #8B4513');
  title.style('text-align', 'center');
  title.style('margin', '0');
  title.style('z-index', '2');
  
  // Create subtitle with medieval styling
  let subtitle = createElement('p', 'Defend thy tower against waves of enemies!');
  subtitle.parent(uiContainer);
  subtitle.style('position', 'absolute');
  subtitle.style('width', '400px');
  subtitle.style('left', '50%');
  subtitle.style('top', '33%');
  subtitle.style('transform', 'translate(-50%, 0)');
  subtitle.style('color', '#FFF8DC'); // Cornsilk color
  subtitle.style('font-family', "'MedievalSharp', cursive");
  subtitle.style('font-size', '24px');
  subtitle.style('text-align', 'center');
  subtitle.style('margin', '0');
  subtitle.style('text-shadow', '2px 2px 4px #000000');
  subtitle.style('z-index', '2');
  
  // Create Start Game button with wooden texture
  let startBtn = createButton('Start Game');
  startBtn.parent(uiContainer);
  startBtn.style('position', 'absolute');
  startBtn.style('width', '200px');
  startBtn.style('height', '50px');
  startBtn.style('left', '50%');
  startBtn.style('top', '50%');
  startBtn.style('transform', 'translate(-50%, 0)');
  startBtn.style('font-size', '24px');
  startBtn.style('font-family', "'MedievalSharp', cursive");
  startBtn.style('color', '#FFF8DC');
  startBtn.style('background', 'linear-gradient(to bottom, #8B4513, #654321)');
  startBtn.style('border', '3px solid #4A2810');
  startBtn.style('border-radius', '5px');
  startBtn.style('cursor', 'pointer');
  startBtn.style('box-shadow', '0 4px 8px rgba(0,0,0,0.5)');
  startBtn.style('text-shadow', '2px 2px 2px #000000');
  startBtn.style('z-index', '2');
  startBtn.mouseOver(() => {
    startBtn.style('background', 'linear-gradient(to bottom, #9B5523, #755331)');
    startBtn.style('transform', 'translate(-50%, -2px)');
  });
  startBtn.mouseOut(() => {
    startBtn.style('background', 'linear-gradient(to bottom, #8B4513, #654321)');
    startBtn.style('transform', 'translate(-50%, 0)');
  });
  startBtn.mousePressed(() => {
    removeElements();
    startGame(1);
  });
  
  // Create Level Select button with metal texture
  let levelBtn = createButton('Level Select');
  levelBtn.parent(uiContainer);
  levelBtn.style('position', 'absolute');
  levelBtn.style('width', '200px');
  levelBtn.style('height', '50px');
  levelBtn.style('left', '50%');
  levelBtn.style('top', '50%');
  levelBtn.style('transform', 'translate(-50%, 70px)');
  levelBtn.style('font-size', '24px');
  levelBtn.style('font-family', "'MedievalSharp', cursive");
  levelBtn.style('color', '#FFF8DC');
  levelBtn.style('background', 'linear-gradient(to bottom, #808080, #505050)');
  levelBtn.style('border', '3px solid #404040');
  levelBtn.style('border-radius', '5px');
  levelBtn.style('cursor', 'pointer');
  levelBtn.style('box-shadow', '0 4px 8px rgba(0,0,0,0.5)');
  levelBtn.style('text-shadow', '2px 2px 2px #000000');
  levelBtn.style('z-index', '2');
  levelBtn.mouseOver(() => {
    levelBtn.style('background', 'linear-gradient(to bottom, #909090, #606060)');
    levelBtn.style('transform', 'translate(-50%, 68px)');
  });
  levelBtn.mouseOut(() => {
    levelBtn.style('background', 'linear-gradient(to bottom, #808080, #505050)');
    levelBtn.style('transform', 'translate(-50%, 70px)');
  });
  levelBtn.mousePressed(showLevelSelector);
  
  // Add Google Font link to head if not already present
  if (!select('link[href*="MedievalSharp"]')) {
    let link = createElement('link');
    link.attribute('href', 'https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap');
    link.attribute('rel', 'stylesheet');
    document.head.appendChild(link.elt);
  }
  
  // Draw the menu background
  clear();
  drawMenuBackground();
}

function showLevelSelector() {
  // Remove existing UI elements
  removeElements();
  
  // Get or create UI container
  let uiContainer = select('#uiContainer');
  if (!uiContainer) {
    uiContainer = createElement('div');
    uiContainer.id('uiContainer');
    uiContainer.style('position', 'absolute');
    uiContainer.style('width', '800px');
    uiContainer.style('height', '600px');
    uiContainer.style('left', '50%');
    uiContainer.style('top', '50%');
    uiContainer.style('transform', 'translate(-50%, -50%)');
    uiContainer.style('z-index', '1');
  }
  
  // Create title with medieval styling
  let title = createElement('h2', 'Choose Thy Level');
  title.parent(uiContainer);
  title.style('position', 'absolute');
  title.style('width', '400px');
  title.style('left', '50%');
  title.style('top', '33%');
  title.style('transform', 'translate(-50%, -100%)');
  title.style('color', '#FFD700');
  title.style('font-family', "'MedievalSharp', cursive");
  title.style('font-size', '48px');
  title.style('text-shadow', '2px 2px 8px #000000, -1px -1px 0 #8B4513, 1px -1px 0 #8B4513, -1px 1px 0 #8B4513, 1px 1px 0 #8B4513');
  title.style('-webkit-text-stroke', '2px #8B4513');
  title.style('text-align', 'center');
  title.style('margin', '0');
  title.style('z-index', '2');
  
  // Create back button with wooden texture
  let backBtn = createButton('Back');
  backBtn.parent(uiContainer);
  backBtn.style('position', 'absolute');
  backBtn.style('width', '100px');
  backBtn.style('height', '40px');
  backBtn.style('left', '20px');
  backBtn.style('top', '20px');
  backBtn.style('font-size', '18px');
  backBtn.style('font-family', "'MedievalSharp', cursive");
  backBtn.style('color', '#FFF8DC');
  backBtn.style('background', 'linear-gradient(to bottom, #8B4513, #654321)');
  backBtn.style('border', '3px solid #4A2810');
  backBtn.style('border-radius', '5px');
  backBtn.style('cursor', 'pointer');
  backBtn.style('box-shadow', '0 4px 8px rgba(0,0,0,0.5)');
  backBtn.style('text-shadow', '2px 2px 2px #000000');
  backBtn.style('z-index', '2');
  backBtn.mouseOver(() => {
    backBtn.style('background', 'linear-gradient(to bottom, #9B5523, #755331)');
    backBtn.style('transform', 'translateY(-2px)');
  });
  backBtn.mouseOut(() => {
    backBtn.style('background', 'linear-gradient(to bottom, #8B4513, #654321)');
    backBtn.style('transform', 'translateY(0)');
  });
  backBtn.mousePressed(() => {
    removeElements();
    showMainMenu();
  });
  
  // Create level buttons with shield design
  for(let i = 1; i <= 5; i++) {
    let btn = createButton('Level ' + i);
    btn.parent(uiContainer);
    btn.style('position', 'absolute');
    btn.style('width', '200px');
    btn.style('height', '50px');
    btn.style('left', '50%');
    btn.style('top', `${height/3 + i * 60}px`);
    btn.style('transform', 'translate(-50%, 0)');
    btn.style('font-size', '24px');
    btn.style('font-family', "'MedievalSharp', cursive");
    btn.style('color', '#FFF8DC');
    btn.style('background', 'linear-gradient(135deg, #C0C0C0 0%, #808080 50%, #404040 100%)');
    btn.style('border', '3px solid #404040');
    btn.style('border-radius', '5px');
    btn.style('cursor', 'pointer');
    btn.style('box-shadow', '0 4px 8px rgba(0,0,0,0.5)');
    btn.style('text-shadow', '2px 2px 2px #000000');
    btn.style('overflow', 'hidden');
    btn.style('padding-left', '40px');
    btn.style('background-size', '200% 200%');
    btn.style('transition', 'all 0.3s ease');
    btn.style('z-index', '2');
    
    // Add shield decoration
    let shield = createElement('div');
    shield.parent(btn);
    shield.style('position', 'absolute');
    shield.style('left', '10px');
    shield.style('top', '50%');
    shield.style('transform', 'translateY(-50%)');
    shield.style('width', '30px');
    shield.style('height', '30px');
    shield.style('background', 'linear-gradient(45deg, #FFD700 0%, #DAA520 100%)');
    shield.style('clip-path', 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)');
    shield.style('z-index', '3');
    
    btn.mouseOver(() => {
      btn.style('background-position', '100% 100%');
      btn.style('transform', 'translate(-50%, -2px)');
    });
    btn.mouseOut(() => {
      btn.style('background-position', '0% 0%');
      btn.style('transform', 'translate(-50%, 0)');
    });
    
    // Create a closure to capture the correct level value
    let level = i;
    btn.mousePressed(() => {
      removeElements();
      startGame(level);
    });
  }
  
  // Add Google Font link to head if not already present
  if (!select('link[href*="MedievalSharp"]')) {
    let link = createElement('link');
    link.attribute('href', 'https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap');
    link.attribute('rel', 'stylesheet');
    document.head.appendChild(link.elt);
  }
}

function draw() {
  if (!gameStarted) {
    // Show animated background for menus
    background(70, 90, 120);
    
    // Draw animated mountains in background
    drawMenuBackground();
    return;
  }
  
  // Start with a complete reset of the canvas using background()
  // Use a color that matches the bottom of our sky gradient
  const theme = getCurrentTheme();
  background(theme.sky.bottom[0], theme.sky.bottom[1], theme.sky.bottom[2]);
  
  let dt = deltaTime / 1000;

  // Update game objects
  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update(dt);
    if (enemies[i].pos.x < 0) enemies.splice(i, 1);
  }

  for (let i = arrows.length - 1; i >= 0; i--) {
    arrows[i].update(dt);
    if (arrows[i].pos.x > width || arrows[i].pos.x < 0 || arrows[i].pos.y > getGroundY(arrows[i].pos.x)) {
      arrows.splice(i, 1);
    }
  }

  // Check collisions
  let arrowsToRemove = new Set();
  let enemiesToRemove = new Set();
  for (let i = 0; i < arrows.length; i++) {
    if (arrows[i].stuck) {
      // Skip stuck arrows
      continue;
    }
    
    for (let j = 0; j < enemies.length; j++) {
      let hitDistance = dist(arrows[i].pos.x, arrows[i].pos.y, enemies[j].pos.x, enemies[j].pos.y);
      let hitThreshold = enemies[j].getHeight()/2;
      
      // Use a slightly larger hit detection area to maintain gameplay feel
      if (hitDistance < hitThreshold) {
        // Hit detected
        arrows[i].stuck = true;
        arrows[i].stuckToEnemy = true;
        arrows[i].stuckPos = {
          x: arrows[i].pos.x - enemies[j].pos.x,
          y: arrows[i].pos.y - enemies[j].pos.y
        };
        
        // Apply damage to enemy
        enemies[j].takeDamage(1, arrows[i].pos);
        
        // Check if enemy is defeated
        if (enemies[j].health <= 0) {
          enemiesToRemove.add(j);
          score++;
        }
        
        arrowsToRemove.add(i);
        break;
      }
    }
  }

  // Remove arrows that hit enemies
  Array.from(arrowsToRemove).sort((a, b) => b - a).forEach(i => {
    let arrow = arrows[i];
    if (arrow.stuckToEnemy) {
      stuckArrows.push(arrow);
    }
    arrows.splice(i, 1);
  });

  // Remove defeated enemies
  Array.from(enemiesToRemove).sort((a, b) => b - a).forEach(j => {
    gold += 1;  // Add gold when enemy is defeated
    enemies.splice(j, 1);
  });

  // Spawn enemies based on level config
  const config = getLevelConfig(currentLevel);
  if (!levelComplete && enemiesSpawned < config.enemyCount) {
    let currentTime = millis();
    let timeSinceLastSpawn = currentTime - lastEnemyTime;
    
    // Special handling for first enemy in all levels
    let shouldSpawnWave = false;
    if (enemiesSpawned === 0) {
      // First enemy of any level should always spawn alone
      shouldSpawnWave = false;
    } else {
      // Normal wave spawn logic for all other cases
      shouldSpawnWave = (enemies.length === 0 && timeSinceLastSpawn > config.waveCooldown);
    }
    
    // Check if it's time to spawn
    if (timeSinceLastSpawn > config.minSpawnGap) {
      if (shouldSpawnWave) {
        // Spawn a wave of enemies
        let waveSize = min(
          config.waveSize,
          config.enemyCount - enemiesSpawned
        );
        
        for (let i = 0; i < waveSize; i++) {
          enemies.push(new Enemy(config));
          enemiesSpawned++;
          lastEnemyTime = currentTime + i * random(200, 400);
        }
      } else {
        // Single enemy spawn
        enemies.push(new Enemy(config));
        enemiesSpawned++;
        lastEnemyTime = currentTime;
        
        // After spawning first enemy in any level, set lastEnemyTime to force a delay
        if (enemiesSpawned === 1) {
          lastEnemyTime = currentTime;  // Reset spawn timer for next wave
        }
      }
      
      // Check for level completion
      if (enemiesSpawned >= config.enemyCount && enemies.length === 0) {
        levelComplete = true;
      }
    }
  } else if (enemiesSpawned >= config.enemyCount && enemies.length === 0) {
    levelComplete = true;
  }

  // Draw everything from scratch each frame
  drawBackground();
  drawWater();    // Draw water first (behind terrain)
  drawTerrain();  // Draw environment
  drawEnvironment();
  
  let sortedEnemies = [...enemies].sort((a, b) => a.pos.y - b.pos.y);
  sortedEnemies.forEach(enemy => enemy.draw());
  
  arrows.forEach(arrow => arrow.draw());
  drawTower();

  // Update and draw blood particles
  for (let i = bloodParticles.length - 1; i >= 0; i--) {
    bloodParticles[i].update(dt);
    bloodParticles[i].draw();
    if (bloodParticles[i].life <= 0) {
      bloodParticles.splice(i, 1);
    }
  }
  
  // Draw stuck arrows
  stuckArrows.forEach(arrow => arrow.draw());

  // UI
  drawUI();
}

function drawUI() {
  // Reset text properties to ensure consistent rendering
  textAlign(LEFT);
  textSize(24);
  
  // Use solid white for UI text with a subtle black outline for better visibility
  push();
  // Draw text shadow/outline first
  fill(0, 0, 0, 200);
  text("Score: " + score, 12, 32);
  text("Gold: " + gold, 202, 32);
  text("Tower Health: " + towerHealth, 12, 62);
  text("Level: " + currentLevel, 12, 92);
  
  // Draw the actual text on top
  fill(255);
  text("Score: " + score, 10, 30);
  text("Gold: " + gold, 200, 30);
  text("Tower Health: " + towerHealth, 10, 60);
  text("Level: " + currentLevel, 10, 90);
  pop();

  if (levelComplete) {
    push();
    textAlign(CENTER);
    textSize(48);
    
    // Draw text shadow/outline first
    fill(0, 0, 0, 200);
    text("LEVEL " + currentLevel + " COMPLETE!", width/2 + 2, height/2 - 98);
    
    // Draw the actual text on top
    fill(255, 255, 0);
    text("LEVEL " + currentLevel + " COMPLETE!", width/2, height/2 - 100);
    pop();
    
    // Draw upgrade UI window
    drawUpgradeUI();
    
    // Create next level button if it doesn't exist - positioned at center screen
    if (!nextLevelButton) {
      nextLevelButton = createButton('Start Level ' + (currentLevel + 1));
      nextLevelButton.position(width/2 - 60, height/2 + 50);  // Centered vertically
      nextLevelButton.style('width', '120px');
      nextLevelButton.style('height', '40px');
      nextLevelButton.style('font-size', '16px');
      nextLevelButton.mousePressed(startNextLevel);
    }
  }

  if (towerHealth <= 0) {
    push();
    textAlign(CENTER);
    textSize(48);
    
    // Draw text shadow/outline first
    fill(0, 0, 0, 200);
    text("GAME OVER", width/2 + 2, height/2 + 2);
    
    // Draw the actual text on top
    fill(255, 0, 0);
    text("GAME OVER", width/2, height/2);
    pop();
    
    // Create restart button if it doesn't exist
    if (!nextLevelButton) {  // Reuse nextLevelButton variable to track restart button
      nextLevelButton = createButton('Restart Game');
      nextLevelButton.position(width/2 - 60, height/2 + 50);
      nextLevelButton.style('width', '120px');
      nextLevelButton.style('height', '40px');
      nextLevelButton.style('font-size', '16px');
      nextLevelButton.mousePressed(restartGame);
    }
    noLoop();
  }
}

function drawUpgradeUI() {
  // Position upgrade window on the left side
  let x = 20;  // Move to left edge with small margin
  let y = height/2 - 75;  // Adjusted position (halfway between -100 and -50)
  let w = 250;  // Make window narrower
  let h = 200;  // Make window shorter
  
  // Draw window background
  fill(50, 50, 50, 230);
  stroke(255, 215, 0);
  strokeWeight(2);
  rect(x, y, w, h, 10);
  
  // Use push/pop to ensure drawing state is preserved
  push();
  
  // Draw title
  noStroke();
  fill(255, 215, 0);
  textAlign(LEFT);
  textSize(20);  // Slightly smaller title
  text("Upgrades", x + 15, y + 30);
  
  // Draw gold amount
  textAlign(RIGHT);
  text(gold + " Gold", x + w - 15, y + 30);
  
  // Draw upgrade options
  textAlign(LEFT);
  textSize(14);  // Smaller text for upgrades
  let startY = y + 55;  // Reduce spacing from top
  let spacing = 45;  // Reduce spacing between upgrades
  
  Object.values(UPGRADES).forEach((upgrade, index) => {
    let upgradeY = startY + index * spacing;
    
    // Draw upgrade name and level
    fill(255);
    text(upgrade.name + " (Level " + upgrade.level + "/" + upgrade.maxLevel + ")", x + 15, upgradeY);
    
    // Draw upgrade cost
    fill(255, 215, 0);
    text(upgrade.cost + " Gold", x + 15, upgradeY + 20);
    
    // Draw upgrade button if can afford and not max level
    if (upgrade.level < upgrade.maxLevel) {
      let buttonColor = gold >= upgrade.cost ? color(0, 255, 0, 150) : color(150, 150, 150, 150);
      fill(buttonColor);
      stroke(255);
      strokeWeight(1);
      rect(x + w - 75, upgradeY - 15, 55, 25, 5);  // Made button smaller (was 70 wide)
      
      fill(255);
      noStroke();
      textAlign(CENTER);
      text("Upgrade", x + w - 47, upgradeY + 5);  // Adjusted text position to match new button
      textAlign(LEFT);
    } else {
      fill(255, 215, 0);
      text("MAX", x + w - 65, upgradeY + 5);
    }
  });
  
  // Restore drawing state
  pop();
}

// Update the handleUpgradeClick function to match new position and button size
function handleUpgradeClick(mouseX, mouseY) {
  if (!levelComplete) return;
  
  let x = 20;  // Match new x position
  let y = height/2 - 75;  // Match new y position
  let w = 250;  // Match new width
  let startY = y + 55;  // Match new startY
  let spacing = 45;  // Match new spacing
  
  Object.values(UPGRADES).forEach((upgrade, index) => {
    let upgradeY = startY + index * spacing;
    let buttonX = x + w - 75;  // Match new button position
    let buttonY = upgradeY - 15;
    
    if (mouseX >= buttonX && mouseX <= buttonX + 55 &&  // Match new button width
        mouseY >= buttonY && mouseY <= buttonY + 25) {  // Match new button height
      if (gold >= upgrade.cost && upgrade.level < upgrade.maxLevel) {
        gold -= upgrade.cost;
        upgrade.level++;
        upgrade.cost = Math.floor(upgrade.cost * 1.5);
        
        // Apply upgrade effects
        switch(upgrade.name) {
          case "Tower Health":
            towerHealth = UPGRADES.TOWER_HEALTH.getValue(UPGRADES.TOWER_HEALTH.level);
            break;
          case "Arrow Speed":
            maxSpeed = 600 * UPGRADES.ARROW_SPEED.getValue(UPGRADES.ARROW_SPEED.level);
            break;
          // Arrow damage is applied when arrows hit enemies
        }
      }
    }
  });
}

// Modify mousePressed to handle upgrade clicks
function mousePressed() {
  if (!gameStarted || towerHealth <= 0) return;
  
  if (levelComplete) {
    handleUpgradeClick(mouseX, mouseY);
    return;
  }
  
  isDragging = true;
  dragStartX = mouseX;
  dragStartY = mouseY;
}

function mouseDragged() {
  if (!isDragging) return;
  // Don't do anything else here - just track the drag state
}

function mouseReleased() {
  if (!gameStarted || !isDragging || towerHealth <= 0) return;
  
  // Calculate pull distance
  let dx = mouseX - dragStartX;
  let dy = mouseY - dragStartY;
  let pullDist = constrain(dist(dragStartX, dragStartY, mouseX, mouseY), 0, maxPullback);
  
  if (pullDist > 20) { // Minimum pull to prevent accidental shots
    // Quadratic scaling - good balance between control and power
    let pullPercent = pullDist / maxPullback;
    
    // Increase max speed to allow reaching the end of the map with optimal angle
    let baseSpeed = map(pullPercent * pullPercent, 0, 1, minSpeed, maxSpeed);
    
    // Shoot in opposite direction of drag
    let angle = atan2(dy, dx);
    
    // Adjust speed based on angle - optimal angle is around -PI/4 (45 degrees up)
    let speed = baseSpeed;
    
    // Angle effectiveness - more dramatic effect on distance
    if (angle > 0) { // Aiming down - very ineffective
      speed *= 0.5; // 50% power when aiming down (increased from 30%)
    } else if (angle > -PI/6) { // Too flat
      speed *= map(angle, -PI/6, 0, 0.8, 0.5); // 50-80% power (increased from 30-70%)
    } else if (angle > -PI/3) { // Near optimal range
      speed *= map(angle, -PI/3, -PI/6, 1.0, 0.8); // 80-100% power (increased from 70-100%)
    } else if (angle > -PI/2) { // Getting too steep
      speed *= map(angle, -PI/2, -PI/3, 0.8, 1.0); // 80-100% power (increased from 70-100%)
    } else { // Too steep
      speed *= map(angle, -PI, -PI/2, 0.5, 0.8); // 50-80% power (increased from 30-70%)
    }
    
    let vx = -cos(angle) * speed;
    let vy = -sin(angle) * speed;
    
    // Calculate target distance (where arrow would land horizontally)
    let targetX = archerPos.x - cos(angle) * 1600; // Increased from 800 to 1600
    let targetDist = dist(archerPos.x, archerPos.y, targetX, archerPos.y);
    
    // Scale upward bias based on distance - less arc for close shots
    let arcScale = map(targetDist, 50, 1600, 0.1, 0.4, true); // Increased from 800 to 1600
    vy -= abs(vx) * arcScale;
    
    arrows.push(new Arrow({x: archerPos.x, y: archerPos.y}, {x: vx, y: vy}));
  }
  
  isDragging = false;
}

function generateMountains(level) {
  const theme = getCurrentTheme();
  for (let i = 0; i < 7; i++) {
    let mountain = {
      x: 50 + i * 120,
      height: random(150, 250),
      width: random(250, 350),
      points: []
    };
    
    // Generate points with level-specific variations
    let basePoints = [];
    for (let j = 0; j <= 60; j++) {
      let x = -mountain.width/2 + (mountain.width * j / 60);
      // Use level to affect mountain shape
      let h = noise(x * 0.01 + level * 1000 + i * 100) * mountain.height;
      h *= map(abs(x), 0, mountain.width/2, 1, 0.7);
      basePoints.push({
        x: x,
        y: -h
      });
    }
    mountain.points = basePoints;
    mountains.push(mountain);
  }
}

function generateTrees(level) {
  trees = [];
  let treeCount = 15 + Math.floor(random(5));
  let maxAttempts = 50; // Prevent infinite loops
  
  // Calculate tree width based on style and height
  const getTreeWidth = (style, height) => {
    switch(style) {
      case 0: return height * 0.7; // Pine trees are narrower
      case 1: return height * 0.8; // Oak trees are wider
      case 2: return height * 0.9; // Willow trees are quite wide
      case 3: return height * 0.8; // Cherry trees are medium width
      default: return height * 0.7;
    }
  };
  
  // Try to place trees with minimum spacing
  for (let i = 0; i < treeCount; i++) {
    let attempts = 0;
    let validPosition = false;
    let newTree;
    
    while (!validPosition && attempts < maxAttempts) {
      attempts++;
      
      // Generate a potential tree
      let x = random(width);
      let y = getGroundY(x);
      let height = random(40, 60);
      let style = level % 4;  // 0: Pine, 1: Oak, 2: Willow, 3: Cherry
      
      // Calculate minimum spacing based on tree width
      let treeWidth = getTreeWidth(style, height);
      let minSpacing = treeWidth * 0.7; // Allow some overlap but not too much
      
      // Check distance from other trees
      validPosition = true;
      for (let existingTree of trees) {
        let existingWidth = getTreeWidth(existingTree.style, existingTree.height);
        let minAllowedDist = (treeWidth + existingWidth) * 0.4; // Allow 60% overlap at most
        
        if (dist(x, y, existingTree.x, existingTree.y) < minAllowedDist) {
          validPosition = false;
          break;
        }
      }
      
      // If position is valid, add the tree
      if (validPosition) {
        newTree = { x, y, height, style };
      }
    }
    
    // If we found a valid position, add the tree
    if (validPosition && newTree) {
      trees.push(newTree);
    }
  }
}

function drawTree(tree) {
  push();
  translate(tree.x, tree.y);
  
  switch(tree.style) {
    case 0:  // Pine Tree
      // Trunk
      stroke(101, 67, 33);
      strokeWeight(4);
      line(0, 0, 0, -tree.height * 0.4);
      
      // Triangular layers
      fill(1, 68, 33);
      noStroke();
      for (let i = 0; i < 3; i++) {
        let size = map(i, 0, 3, tree.height, tree.height * 0.4);
        let yOffset = map(i, 0, 3, -tree.height * 0.3, -tree.height);
        triangle(-size/3, yOffset + size/3, 
                0, yOffset - size/3, 
                size/3, yOffset + size/3);
      }
      break;
      
    case 1:  // Oak Tree - Completely redesigned
      // Simple straight trunk
      stroke(101, 67, 33);
      strokeWeight(6);
      line(0, 0, 0, -tree.height * 0.6);
      
      // Simple branches
      strokeWeight(3);
      // Left branches
      line(0, -tree.height * 0.3, -tree.height * 0.15, -tree.height * 0.45);
      line(0, -tree.height * 0.45, -tree.height * 0.2, -tree.height * 0.6);
      
      // Right branches
      line(0, -tree.height * 0.3, tree.height * 0.15, -tree.height * 0.45);
      line(0, -tree.height * 0.45, tree.height * 0.2, -tree.height * 0.6);
      
      // Simple but elegant foliage
      noStroke();
      
      // Main foliage shape - simple oval
      fill(34, 120, 34);
      ellipse(0, -tree.height * 0.8, tree.height * 0.5, tree.height * 0.5);
      
      // Add simple leaf details with a few well-placed shapes
      fill(44, 140, 44);
      // Left side leaves
      ellipse(-tree.height * 0.15, -tree.height * 0.7, tree.height * 0.25, tree.height * 0.2);
      ellipse(-tree.height * 0.2, -tree.height * 0.9, tree.height * 0.2, tree.height * 0.15);
      
      // Right side leaves
      ellipse(tree.height * 0.15, -tree.height * 0.7, tree.height * 0.25, tree.height * 0.2);
      ellipse(tree.height * 0.2, -tree.height * 0.9, tree.height * 0.2, tree.height * 0.15);
      
      // Top leaves
      ellipse(0, -tree.height * 1.0, tree.height * 0.25, tree.height * 0.2);
      
      // Add a few darker accents for depth
      fill(24, 100, 24);
      ellipse(-tree.height * 0.1, -tree.height * 0.8, tree.height * 0.15, tree.height * 0.1);
      ellipse(tree.height * 0.1, -tree.height * 0.8, tree.height * 0.15, tree.height * 0.1);
      
      break;
      
    case 2:  // Willow Tree - Performance optimized design
      // Use tree's unique properties for consistent randomization
      // We'll use the tree's x position as a seed for pseudo-randomness
      let trunkRandom = (n) => {
        return map(sin(tree.x * 0.1 + n * 10), -1, 1, 0, 1);
      };
      
      // Textured trunk
      // Base trunk
      strokeWeight(6);
      stroke(90, 60, 30);
      line(0, 0, 0, -tree.height * 0.5);
      
      // Reduced trunk texture with fewer bark lines
      strokeWeight(1);
      for (let i = 0; i < 3; i++) {
        let xOffset = map(trunkRandom(i), 0, 1, -3, 3);
        let height = map(trunkRandom(i + 8), 0, 1, 0.3, 0.5) * tree.height;
        stroke(110, 70, 40, 200);
        line(xOffset, 0, xOffset, -height);
      }
      
      // Add some small branches at the top of the trunk - reduced to just two
      stroke(100, 65, 35);
      strokeWeight(2);
      // Left branch
      line(0, -tree.height * 0.45, -tree.height * 0.1, -tree.height * 0.55);
      // Right branch
      line(0, -tree.height * 0.45, tree.height * 0.1, -tree.height * 0.55);
      
      // Main foliage - layered for depth
      noStroke();
      
      // Base layer - darker green
      fill(40, 100, 40, 220);
      ellipse(0, -tree.height * 0.6, tree.height * 0.6, tree.height * 0.3);
      
      // Middle layer - medium green
      fill(60, 130, 60, 200);
      ellipse(0, -tree.height * 0.65, tree.height * 0.5, tree.height * 0.25);
      
      // Hanging willow branches with varied colors and lengths - drastically reduced count
      for (let i = 0; i < 8; i++) {
        let angle = i * TWO_PI / 8;
        let startX = cos(angle) * (tree.height * 0.25);
        let startY = -tree.height * 0.6;
        
        // Simplified color variation
        let greenHue = 100 + map(trunkRandom(i + 20), 0, 1, -20, 20);
        
        stroke(60, greenHue, 60, 180);
        strokeWeight(1);
        noFill();
        
        // Simplified curve with minimal segments
        beginShape();
        vertex(startX, startY);
        
        // Length variation - but consistent for this branch
        let branchLength = tree.height * 0.3;
        
        // Just draw a simple quadratic curve instead of many segments
        let endX = startX + cos(angle) * branchLength;
        let endY = startY + branchLength * 1.2;
        let controlX = startX + cos(angle) * branchLength * 0.5;
        let controlY = startY + branchLength * 0.4;
        
        quadraticVertex(controlX, controlY, endX, endY);
        endShape();
        
        // Add just one leaf cluster at the end of each branch
        noStroke();
        fill(60, 150, 60, 180);
        
        // Small cluster of leaves - simplified to just 2 leaves
        ellipse(endX, endY, 6, 4);
        ellipse(endX + 3, endY + 2, 5, 3);
      }
      
      break;
      
    case 3:  // Cherry Blossom - Ultra performance optimized design
      // Use tree's unique properties for consistent randomization
      let blossomRandom = (n) => {
        return map(sin(tree.x * 0.2 + n * 12), -1, 1, 0, 1);
      };
      
      // Clear, visible trunk
      stroke(120, 80, 60);
      strokeWeight(5);
      line(0, 0, 0, -tree.height * 0.6);
      
      // Add just 3 short branches at the top
      strokeWeight(2);
      for (let i = 0; i < 3; i++) {
        let angle = i * TWO_PI / 3;
        let startY = -tree.height * 0.6; // All branches start at top of trunk
        let length = tree.height * 0.12;
        
        // Draw branch
        line(0, startY, 
             cos(angle) * length, startY + sin(angle) * length * 0.3);
      }
      
      // Simple, distinct cherry blossoms in a rounded volume on top
      noStroke();
      
      // Main pink blossom layer - drastically reduced count
      fill(255, 200, 220);
      ellipse(0, -tree.height * 0.75, tree.height * 0.4, tree.height * 0.35);
      
      // Add just a few individual blossoms for detail
      for (let i = 0; i < 8; i++) {
        // Position blossoms in a dome shape on top of the trunk
        let angle = i * TWO_PI / 8;
        let radius = tree.height * 0.18;
        
        let x = cos(angle) * radius;
        let y = -tree.height * 0.75 + sin(angle) * radius * 0.5;
        
        // Draw simplified blossom
        drawSimpleBlossom(x, y, tree.height * 0.08);
      }
      
      // Helper function to draw a simplified cherry blossom
      function drawSimpleBlossom(x, y, size) {
        // Draw 4 petals instead of 5
        fill(255, 220, 230);
        
        for (let j = 0; j < 4; j++) {
          let petalAngle = j * TWO_PI / 4;
          let petalX = x + cos(petalAngle) * size * 0.5;
          let petalY = y + sin(petalAngle) * size * 0.5;
          
          // Direct ellipse drawing instead of push/pop/rotate
          ellipse(petalX, petalY, size * 0.6, size * 0.6);
        }
        
        // Yellow center
        fill(255, 230, 100);
        ellipse(x, y, size * 0.3);
      }
      break;
  }
  pop();
}

function generateRockShape() {
  let points = [];
  let numPoints = floor(random(6, 8));
  for (let j = 0; j < numPoints; j++) {
    let angle = (j / numPoints) * TWO_PI;
    let r = random(0.8, 1.2);
    points.push({
      x: cos(angle) * r,
      y: sin(angle) * r
    });
  }
  return points;
}

function generateGrass(level) {
  const theme = getCurrentTheme();
  const grassDensity = theme === THEMES.WINTER ? 0.4 :
                      theme === THEMES.AUTUMN ? 0.6 :
                      theme === THEMES.SPRING ? 0.9 :
                      0.7;
  
  for (let x = 0; x < width; x += 30) {
    if (random() < grassDensity) {
      let baseY = getGroundY(x);
      for (let i = 0; i < 5; i++) {
        let blades = [];
        for (let j = 0; j < 3; j++) {
          blades.push({
            xOffset: random(-4, 4),
            heightMod: random(0.7, 1.3),
            blade: random(0.8, 1.2)
          });
        }
        grassDetails.push({
          x: x + random(-20, 20),
          y: baseY,
          height: random(5, 10),
          blades: blades,
          seasonal: theme
        });
      }
    }
  }
}

class BloodParticle {
  constructor(x, y, vel) {
    this.pos = { x, y };
    this.vel = vel;
    this.life = 1.0;
    this.size = random(3, 6);
  }

  update(dt) {
    this.vel.y += g * dt * 0.5; // Half gravity for blood
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.life -= dt * 2;
  }

  draw() {
    noStroke();
    fill(200, 0, 0, this.life * 255);
    circle(this.pos.x, this.pos.y, this.size * this.life);
  }
}

function startNextLevel() {
  console.log('\n=== STARTING NEXT LEVEL ===');
  console.log('Current level before reset:', currentLevel);
  
  // Store values we want to keep
  let oldScore = score;
  let oldGold = gold;  // Keep gold between levels
  let nextLevel = currentLevel + 1;
  
  // Remove UI elements
  if (nextLevelButton) {
    nextLevelButton.remove();
    nextLevelButton = null;
  }
  removeElements();
  
  // COMPLETE reset of ALL game state variables
  enemies = [];
  arrows = [];
  stuckArrows = [];
  bloodParticles = [];
  score = 0;
  towerHealth = 100;
  lastEnemyTime = 0;
  groundPoints = [];
  trees = [];
  rocks = [];
  mountains = [];
  mountainPoints = [];
  grassDetails = [];
  skyGradient = [];
  treeShapes = [];
  rockDetails = [];
  
  // Reset ALL level system variables
  currentLevel = nextLevel;  // Set the new level number
  enemiesRemaining = getLevelConfig(nextLevel).enemyCount;
  enemiesSpawned = 0;  // Critical: ensure this is 0
  levelComplete = false;
  levelStartTime = millis();
  levelTransitionTimer = 0;
  gameStarted = true;  // Keep the game running
  
  // Reset input state
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;
  
  console.log('After reset:');
  console.log('- New Level:', currentLevel);
  console.log('- Enemies Spawned:', enemiesSpawned);
  console.log('- Enemies Remaining:', enemiesRemaining);
  
  // Initialize the new level
  initLevel(currentLevel);
  
  // Force a wave spawn by setting lastEnemyTime way back
  lastEnemyTime = -99999;  // This ensures the wave cooldown check passes
  
  // Restore values
  score = oldScore;
  gold = oldGold;
  
  console.log('=== NEXT LEVEL START COMPLETE ===\n');
}

function restartGame() {
  // Remove UI elements
  if (nextLevelButton) {
    nextLevelButton.remove();
    nextLevelButton = null;
  }
  removeElements();
  
  // Reset ALL game state variables
  enemies = [];
  arrows = [];
  stuckArrows = [];
  bloodParticles = [];
  score = 0;
  towerHealth = 100;
  lastEnemyTime = 0;
  groundPoints = [];
  trees = [];
  rocks = [];
  mountains = [];
  mountainPoints = [];
  grassDetails = [];
  skyGradient = [];
  treeShapes = [];
  rockDetails = [];
  
  // Reset level system variables
  currentLevel = 1;
  enemiesRemaining = getLevelConfig(1).enemyCount;
  enemiesSpawned = 0;
  levelComplete = false;
  levelStartTime = millis();
  levelTransitionTimer = 0;
  gameStarted = true;
  
  // Reset input state
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;
  
  // Reset upgrade levels
  Object.values(UPGRADES).forEach(upgrade => {
    upgrade.level = 1;
    upgrade.cost = upgrade.cost;  // Reset to initial cost
  });
  
  gold = 0;  // Reset gold on game restart
  
  // Initialize first level
  initLevel(1);
  
  // Restart the game loop
  loop();
}

function drawMenuBackground() {
  // Draw gradient sky
  let skyGradient = drawingContext.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, '#1a0f3c');  // Dark blue-purple
  skyGradient.addColorStop(0.5, '#2a1f5c'); // Medium blue-purple
  skyGradient.addColorStop(1, '#3a2f7c');   // Lighter blue-purple
  drawingContext.fillStyle = skyGradient;
  rect(0, 0, width, height);
  
  // Draw stars
  fill(255, 255, 255, 150);
  for (let i = 0; i < 100; i++) {
    let x = ((frameCount * 0.1 + i * 397) % width);
    let y = (i * 379) % (height/2);
    let size = noise(i * 0.1) * 3;
    circle(x, y, size);
  }
  
  // Draw animated clouds with more detail
  noStroke();
  for (let i = 0; i < 5; i++) {
    let x = ((frameCount * 0.2 + i * 200) % (width + 400)) - 200;
    let y = 100 + i * 30;
    let cloudColor = color(255, 255, 255, 100 + i * 10);
    
    fill(cloudColor);
    // Main cloud body
    ellipse(x, y, 100, 50);
    // Additional cloud puffs
    ellipse(x + 30, y - 15, 70, 35);
    ellipse(x - 30, y - 10, 60, 30);
    ellipse(x + 15, y + 10, 50, 25);
    ellipse(x - 15, y + 5, 45, 22);
  }
  
  // Draw detailed mountains with snow caps
  for (let i = 0; i < 3; i++) {
    let x = width * i/2;
    // Back mountain
    fill(60, 70, 90);
    triangle(x, height, x + 300, height - 200, x + 600, height);
    // Snow cap
    fill(255, 255, 255, 200);
    beginShape();
    vertex(x + 280, height - 180);
    vertex(x + 300, height - 200);
    vertex(x + 320, height - 180);
    endShape();
    
    // Front mountain
    fill(80, 90, 110);
    triangle(x + 150, height, x + 450, height - 150, x + 750, height);
    // Snow cap
    fill(255, 255, 255, 200);
    beginShape();
    vertex(x + 430, height - 130);
    vertex(x + 450, height - 150);
    vertex(x + 470, height - 130);
    endShape();
  }
  
  // Draw detailed ground
  // Dark grass base
  fill(20, 80, 20);
  rect(0, height - 100, width, 100);
  
  // Add grass texture
  for (let i = 0; i < width; i += 10) {
    let grassHeight = noise(i * 0.02, frameCount * 0.01) * 15;
    stroke(34, 139, 34);
    line(i, height - 100, i, height - 100 + grassHeight);
  }
  
  // Add some rocks
  noStroke();
  for (let i = 0; i < 10; i++) {
    let x = (i * 397) % width;
    let y = height - 90 + (i * 7) % 20;
    fill(100, 100, 100);
    ellipse(x, y, 20, 15);
  }
}

function initLevel(level) {
  // Generate terrain with more natural curves and level-specific features
  groundPoints = [];
  let lastY = groundLevel;
  let config = getLevelConfig(level);
  
  // Increase hill height for more dramatic terrain
  config.hillHeight = config.hillHeight * 1.5;
  
  // Create more interesting terrain with valleys and peaks
  for (let x = 0; x <= width; x += 15) { // Smaller steps for more detail
    // Base terrain using Perlin noise with increased frequency
    let baseNoise = noise(x * config.terrainRoughness * 3, level * 10);
    
    // Add more pronounced valleys
    let valleyNoise = sin(x * config.valleyFrequency * 0.03) * 0.8 + 0.2;
    valleyNoise *= noise(x * 0.04 + level * 100) * 0.9;
    
    // Add more pronounced peaks
    let peakNoise = cos(x * config.peakFrequency * 0.03) * 0.8 + 0.2;
    peakNoise *= noise(x * 0.035 + level * 200) * 1.1;
    
    // Add occasional steep cliffs
    let cliffNoise = 0;
    if (noise(x * 0.01 + level * 300) > 0.7) {
      cliffNoise = noise(x * 0.2 + level * 400) * 0.3;
    }
    
    // Combine all noise components with adjusted weights
    let combinedNoise = baseNoise * 0.3 + valleyNoise * 0.3 + peakNoise * 0.3 + cliffNoise;
    let y = groundLevel + (combinedNoise * config.hillHeight - config.hillHeight/2);
    
    // Less smoothing between points for more dramatic terrain
    y = lerp(lastY, y, 0.6);
    groundPoints.push({ x, y });
    lastY = y;
  }

  // Generate environment
  generateMountains(level);
  generateTrees(level);

  // Reset game state for this level
  enemies = [];
  arrows = [];
  stuckArrows = [];
  bloodParticles = [];
  lastEnemyTime = millis();
  
  // Set up level-specific variables
  enemiesRemaining = config.enemyCount;
  enemiesSpawned = 0;
  levelComplete = false;
  levelStartTime = millis();
  levelTransitionTimer = 0;
}

function startGame(level) {
  // Remove any existing UI elements
  removeElements();
  
  // Reset game state for new game
  enemies = [];
  arrows = [];
  stuckArrows = [];
  bloodParticles = [];
  score = 0;
  gold = 0;
  towerHealth = UPGRADES.TOWER_HEALTH.getValue(UPGRADES.TOWER_HEALTH.level);
  lastEnemyTime = 0;
  groundPoints = [];
  trees = [];
  rocks = [];
  mountains = [];
  mountainPoints = [];
  grassDetails = [];
  skyGradient = [];
  treeShapes = [];
  rockDetails = [];
  
  // Set up level
  currentLevel = level;
  enemiesRemaining = getLevelConfig(level).enemyCount;
  enemiesSpawned = 0;
  levelComplete = false;
  levelStartTime = millis();
  levelTransitionTimer = 0;
  
  // Reset upgrade levels
  Object.values(UPGRADES).forEach(upgrade => {
    upgrade.level = 1;
    upgrade.cost = upgrade.cost;
  });
  
  // Initialize level and start game
  initLevel(level);
  gameStarted = true;
  
  // Make sure the canvas is visible and properly positioned
  let canvas = select('canvas');
  if (canvas) {
    canvas.style('display', 'block');
    canvas.style('z-index', '0');
    canvas.style('position', 'absolute');
    canvas.style('left', '50%');
    canvas.style('top', '50%');
    canvas.style('transform', 'translate(-50%, -50%)');
  }
  
  // Force a redraw and start the game loop
  clear();
  draw();
  loop();
}

function drawBackground() {
  // Draw sky gradient
  const theme = getCurrentTheme();
  noStroke();
  
  // Draw sky as a gradient rectangle
  for (let y = 0; y < groundLevel; y++) {
    let inter = map(y, 0, groundLevel, 0, 1);
    let c = lerpColor(
      color(theme.sky.top[0], theme.sky.top[1], theme.sky.top[2]),
      color(theme.sky.bottom[0], theme.sky.bottom[1], theme.sky.bottom[2]),
      inter
    );
    stroke(c);
    line(0, y, width, y);
  }
  
  // Draw clouds
  noStroke();
  fill(255, 255, 255, 200);
  for (let cloud of clouds) {
    // Draw cloud shape (multiple circles)
    for (let i = 0; i < 5; i++) {
      let size = map(i, 0, 4, cloud.width/2, cloud.width/4);
      let offset = i * cloud.width/6;
      ellipse(cloud.x + offset, cloud.y, size, size);
    }
    
    // Move cloud
    cloud.x += cloud.speed * deltaTime/1000;
    if (cloud.x > width + cloud.width) {
      cloud.x = -cloud.width;
      cloud.y = random(50, 150);
    }
  }
  
  // Mountains in background (only draw up to where water starts)
  fill(70, 90, 110);
  noStroke();
  beginShape();
  vertex(0, height/2);
  for (let x = 0; x <= width; x += 50) {
    let mountainHeight = noise(x * 0.005) * 150;
    vertex(x, height/2 - mountainHeight);
  }
  vertex(width, height/2);
  endShape(CLOSE);
  
  // Closer mountains (only draw up to where water starts)
  fill(50, 70, 90);
  beginShape();
  vertex(0, height/2);
  for (let x = 0; x <= width; x += 30) {
    let mountainHeight = noise(x * 0.01 + 1000) * 200;
    vertex(x, height/2 - mountainHeight);
  }
  vertex(width, height/2);
  endShape(CLOSE);
  
  // Draw detailed ground
  // Dark grass base
  fill(20, 80, 20);
  rect(0, height - 100, width, 100);
  
  // Add grass texture
  for (let i = 0; i < width; i += 10) {
    let grassHeight = noise(i * 0.02, frameCount * 0.01) * 15;
    stroke(34, 139, 34);
    line(i, height - 100, i, height - 100 + grassHeight);
  }
  
  // Add some rocks
  noStroke();
  for (let i = 0; i < 10; i++) {
    let x = (i * 397) % width;
    let y = height - 90 + (i * 7) % 20;
    fill(100, 100, 100);
    ellipse(x, y, 20, 15);
  }
}

function drawWater() {
  const theme = getCurrentTheme();
  
  // Base water colors from theme with proper alpha handling
  let waterBase = theme.water.base;
  let waterTop = color(waterBase[0], waterBase[1], waterBase[2], theme.water.alpha);
  let waterBottom = color(
    waterBase[0] * 0.7,
    waterBase[1] * 0.7,
    waterBase[2] * 0.7,
    theme.water.alpha + 20
  );
  
  // Ocean gradient (draw between mountains and terrain)
  noStroke();
  let waterStart = height/2;  // Start at mountain base
  let waterEnd = height;      // Fill all the way to the bottom
  
  // Draw a solid background first to eliminate any white gaps
  fill(waterBottom);
  rect(0, waterStart, width, waterEnd - waterStart);
  
  // Then draw the gradient on top
  for (let y = waterStart; y < waterEnd; y++) {
    let inter = map(y, waterStart, waterEnd, 0, 1);
    let c = lerpColor(waterTop, waterBottom, inter);
    fill(c);
    rect(0, y, width, 1);
  }
  
  // Subtle wave motion
  noFill();
  stroke(255, 255, 255, 15);
      strokeWeight(1);
  
  for (let i = 0; i < 3; i++) {
    beginShape();
    for (let x = 0; x < width; x += 40) {
      let waveOffset = sin(x * 0.01 + frameCount * 0.02 + i * PI) * 2;
      let y = waterStart + 20 * i + waveOffset;
      vertex(x, y);
    }
    endShape();
  }
  
  // Add very subtle highlights
  stroke(255, 255, 255, 10);
  for (let i = 0; i < 5; i++) {
    let y = waterStart + random(100);
    let x1 = random(width);
    let x2 = x1 + random(50, 100);
    line(x1, y, x2, y);
  }
}

function drawTerrain() {
  const theme = getCurrentTheme();
  let config = getLevelConfig(currentLevel);
  
  // Draw the green hills on top of the water
  fill(...theme.grass);
  noStroke();
  beginShape();
  
  // Start below the screen
  vertex(0, height);
  
  // Draw the curvy hills
  for (let x = 0; x <= width; x += 20) {
    let groundHeight = getGroundY(x);
    vertex(x, groundHeight);
  }
  
  // End below the screen
  vertex(width, height);
  endShape(CLOSE);
  
  // Add grass details on top of the hills
  stroke(...theme.grass, 180);
  strokeWeight(1);
  
  for (let x = 0; x <= width; x += 40) {
    let groundHeight = getGroundY(x);
    let grassHeight = noise(x * config.terrainRoughness * 2, currentLevel * 10) * 8;
    line(x, groundHeight, x, groundHeight - grassHeight);
  }
}

function drawEnvironment() {
  // Draw trees
  for (let tree of trees) {
    drawTree(tree);
  }
  
  // Draw rocks (if any exist in your game)
  for (let rock of rocks) {
    fill(150);
    noStroke();
    ellipse(rock.x, rock.y, rock.size, rock.size * 0.8);
  }
}

function drawTower() {
  push(); // Save drawing state
  
  // Main tower body - solid stone color
  fill(160, 155, 150); // Stone gray color
  stroke(120, 115, 110);
  strokeWeight(2);
  rect(towerPos.x - 30, towerPos.y, 60, 100);
  
  // Draw stone texture with consistent colors
  noStroke();
  
  // Use a consistent pattern for bricks instead of random colors
  for(let i = 0; i < 8; i++) {
    for(let j = 0; j < 4; j++) {
      // Use noise instead of random for consistent texture
      let noiseVal = noise(i * 0.5, j * 0.5) * 20;
      
      // Even rows offset by half a brick for realistic pattern
      let xOffset = (j % 2 === 0) ? 0 : 4;
      
      // Stone colors with slight variations based on position
      if ((i + j) % 3 === 0) {
        fill(150, 145, 140); // Darker stone
      } else if ((i + j) % 3 === 1) {
        fill(165, 160, 155); // Medium stone
      } else {
        fill(175, 170, 165); // Lighter stone
      }
      
      // Add subtle shading with noise
      fill(160 - noiseVal, 155 - noiseVal, 150 - noiseVal);
      
      // Draw the brick with offset for odd rows
      rect(towerPos.x - 30 + (i * 8) + xOffset, towerPos.y + j * 25, 7, 23);
    }
  }

  // Draw tower top with detailed stonework
  fill(150, 145, 140);
  stroke(120, 115, 110);
  rect(towerPos.x - 35, towerPos.y - 20, 70, 30);
  
  // Draw detailed crenellations
  for (let i = 0; i < 5; i++) {
    fill(140, 135, 130);
    rect(towerPos.x - 35 + i * 15, towerPos.y - 30, 10, 15);
    // Add shadow detail to crenellations
    fill(110, 105, 100);
    rect(towerPos.x - 35 + i * 15, towerPos.y - 30, 2, 15);
  }
  
  // Draw archer with more detail - moved inside the tower drawing function
  // to ensure proper draw order (archer appears on top of tower)
  drawArcher();
  
  pop(); // Restore drawing state
}

// Create a separate function for drawing the archer
function drawArcher() {
  push(); // Save drawing state for archer
  
  // Head with face details - smaller size
  fill(200, 150, 100);
  stroke(150, 100, 50);
  strokeWeight(1);
  ellipse(archerPos.x, archerPos.y - 10, 15, 15); // Head - smaller
  
  // Face details - adjusted for smaller head
  noStroke();
  fill(50); // Dark color for features
  ellipse(archerPos.x - 3, archerPos.y - 11, 2, 2); // Left eye - smaller
  ellipse(archerPos.x + 3, archerPos.y - 11, 2, 2); // Right eye - smaller
  
  // Body with clothing details - smaller size
  stroke(50);
  fill(60, 100, 150); // Blue tunic
  rect(archerPos.x - 7, archerPos.y, 14, 20); // Body - smaller
  
  // Belt - adjusted for smaller body
  fill(139, 69, 19);
  rect(archerPos.x - 7, archerPos.y + 10, 14, 2);
  
  // Draw bow if dragging
  if (isDragging) {
    // Calculate pull distance and angle
    let dx = mouseX - dragStartX;
    let dy = mouseY - dragStartY;
    let pullDist = constrain(dist(dragStartX, dragStartY, mouseX, mouseY), 0, maxPullback);
    let angle = atan2(dy, dx);
    
    if (pullDist > 20) {
      // Draw bow - smaller size
      stroke(139, 69, 19);
      strokeWeight(2); // Thinner stroke for smaller bow
      noFill();
      // Bow faces opposite to drag direction
      arc(archerPos.x, archerPos.y, 30, 30, angle + PI - PI/4, angle + PI + PI/4);
      
      // Draw trajectory preview with same physics as arrows
      let pullPercent = pullDist / maxPullback;
      let speed = map(pullPercent * pullPercent, 0, 1, minSpeed, maxSpeed);
      
      // Apply the same angle effectiveness as in mouseReleased
      if (angle > 0) { // Aiming down - very ineffective
        speed *= 0.5; // 50% power when aiming down
      } else if (angle > -PI/6) { // Too flat
        speed *= map(angle, -PI/6, 0, 0.8, 0.5); // 50-80% power
      } else if (angle > -PI/3) { // Near optimal range
        speed *= map(angle, -PI/3, -PI/6, 1.0, 0.8); // 80-100% power
      } else if (angle > -PI/2) { // Getting too steep
        speed *= map(angle, -PI/2, -PI/3, 0.8, 1.0); // 80-100% power
      } else { // Too steep
        speed *= map(angle, -PI, -PI/2, 0.5, 0.8); // 50-80% power
      }
      
      let vx = -cos(angle) * speed;
      let vy = -sin(angle) * speed;
      
      // Calculate target distance for arc scaling
      let targetX = archerPos.x - cos(angle) * 1600;
      let targetDist = dist(archerPos.x, archerPos.y, targetX, archerPos.y);
      let arcScale = map(targetDist, 50, 1600, 0.1, 0.4, true);
      vy -= abs(vx) * arcScale;
      
      // Draw partial trajectory preview - only show the beginning of the path
      stroke(255, 150);
      strokeWeight(2);
      noFill();
      beginShape();
      let px = archerPos.x;
      let py = archerPos.y;
      let predictVx = vx;
      let predictVy = vy;
      let dt = 1/30;
      
      // Show more of the trajectory but still fade out before landing
      let maxPoints = 20; // Increased from 12 to 20 points (about half of original)
      let fadeStart = 10; // Start fading after this many points
      
      for (let i = 0; i < maxPoints; i++) {
        // Fade out the line as it gets further from the archer
        if (i >= fadeStart) {
          let alpha = map(i, fadeStart, maxPoints, 150, 10); // Fade to 10 instead of 0 for slight visibility
          stroke(255, alpha);
        }
        
        vertex(px, py);
        px += predictVx * dt;
        py += predictVy * dt;
        predictVy += g * dt;
        
        if (py > getGroundY(px)) break;
        if (px > width || px < 0) break; // Stop preview at screen edges
      }
      endShape();
      
      // Draw bowstring - adjusted for smaller bow
      stroke(139, 69, 19);
      strokeWeight(1);
      let power = (pullDist / maxPullback) * 0.8;
      let stringPull = power * 15;
      
      // String anchors (opposite to drag direction) - adjusted for smaller bow
      let bowAngle = angle + PI;
      let topX = archerPos.x + cos(bowAngle - PI/4) * 15;
      let topY = archerPos.y + sin(bowAngle - PI/4) * 15;
      let bottomX = archerPos.x + cos(bowAngle + PI/4) * 15;
      let bottomY = archerPos.y + sin(bowAngle + PI/4) * 15;
      
      // Pull point - adjusted for smaller bow
      let pullX = archerPos.x + cos(bowAngle) * (15 - stringPull);
      let pullY = archerPos.y + sin(bowAngle) * (15 - stringPull);
      
      line(topX, topY, pullX, pullY);
      line(pullX, pullY, bottomX, bottomY);
    }
  } else {
    // Draw bow at rest - smaller size
    stroke(139, 69, 19);
    strokeWeight(2);
    noFill();
    arc(archerPos.x, archerPos.y, 30, 30, -PI/4, PI/4);
    
    // Draw bowstring at rest - adjusted for smaller bow
    strokeWeight(1);
    line(
      archerPos.x + cos(-PI/4) * 15,
      archerPos.y + sin(-PI/4) * 15,
      archerPos.x + cos(PI/4) * 15,
      archerPos.y + sin(PI/4) * 15
    );
  }
  
  pop(); // Restore drawing state
}